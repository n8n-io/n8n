import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types';
import { fixToolCall } from '../tools/fix-tool-call';
import { buildToolMap, resolveToolCallTarget } from '../tools/tool-adapter';
import {
	CALL_TOOL_TOOL_NAME,
	FIND_TOOLS_TOOL_NAME,
	TOOL_CATALOG_GUIDANCE,
	ToolCatalog,
} from '../tools/tool-catalog';
import { filterTools, rankTools, tokenize } from '../tools/tool-search';

function makeTool(name: string, description: string, approval = false): BuiltTool {
	const builder = new Tool(name)
		.description(description)
		.input(z.object({ id: z.string() }))
		.handler(async () => await Promise.resolve({ ok: true }));
	if (approval) builder.requireApproval();
	return builder.build();
}

const tools = [
	makeTool('list_issues', 'List open issues in a Linear team'),
	makeTool('save_issue', 'Create or update a Linear issue', true),
	makeTool('send_message', 'Send a Slack message to a channel'),
	makeTool('get_cell', 'Read a cell from a Hex notebook'),
];

function catalog() {
	return new ToolCatalog(tools, {
		toolGroups: { list_issues: 'linear', save_issue: 'linear', send_message: 'slack' },
	});
}

async function find(input: Record<string, unknown>) {
	const findTool = catalog()
		.getControllerTools()
		.find((tool) => tool.name === FIND_TOOLS_TOOL_NAME);
	return await findTool!.handler!(input, {} as never);
}

describe('tool search', () => {
	it('splits names into words', () => {
		expect(tokenize('saveIssue list_issues n8n-docs')).toEqual([
			'save',
			'issue',
			'list',
			'issues',
			'n8n',
			'docs',
		]);
	});

	it('ranks name matches first', () => {
		expect(rankTools(tools, 'issue linear').map((tool) => tool.name)[0]).toBe('save_issue');
		expect(rankTools(tools, 'slack')).toEqual([tools[2]]);
		expect(rankTools(tools, 'nothing here')).toEqual([]);
	});

	it('filters by regular expression and reports a bad pattern', () => {
		expect(filterTools(tools, '^(list|save)_').map((tool) => tool.name)).toEqual([
			'list_issues',
			'save_issue',
		]);
		expect(() => filterTools(tools, '(')).toThrow('Invalid pattern');
	});

	it('stops a pattern that backtracks for too long', () => {
		const longTool = { name: `${'a'.repeat(30)}!`, description: 'a'.repeat(3000) };
		const startedAt = Date.now();
		expect(() => filterTools([longTool], '^(\\w+)*$')).toThrow('took too long');
		expect(() => filterTools([longTool], '\\w*\\w*\\w*#')).toThrow('took too long');
		expect(Date.now() - startedAt).toBeLessThan(2000);
	});
});

describe('ToolCatalog', () => {
	it('lists every tool name by tool group in its prompt section', () => {
		const section = catalog().renderCatalog();
		expect(section).toContain('- linear: list_issues, save_issue');
		expect(section).toContain('- slack: send_message');
		expect(section).toContain('- tools: get_cell');
	});

	it('adds only find_tools and call_tool to the toolset', () => {
		expect(
			catalog()
				.getControllerTools()
				.map((tool) => tool.name),
		).toEqual([FIND_TOOLS_TOOL_NAME, CALL_TOOL_TOOL_NAME]);
	});

	it('returns full schemas for small result sets', async () => {
		const result = (await find({ group: 'linear' })) as {
			tools: Array<{ name: string; inputSchema?: unknown; needsApproval?: boolean }>;
		};
		expect(result.tools.map((tool) => tool.name)).toEqual(['list_issues', 'save_issue']);
		expect(result.tools[0].inputSchema).toBeDefined();
		expect(result.tools[1].needsApproval).toBe(true);
	});

	it('suggests close names for an unknown tool', async () => {
		const result = (await find({ tools: ['save_issues'] })) as {
			missing: Array<{ name: string; didYouMean?: string[] }>;
		};
		expect(result.missing[0].didYouMean).toContain('save_issue');
	});

	it('reports an unknown tool group with the known ones', async () => {
		expect(await find({ group: 'jira' })).toEqual(
			expect.objectContaining({ groups: expect.arrayContaining(['linear', 'slack']) }),
		);
	});

	it('dispatches call_tool to the named tool with its arguments', () => {
		const map = buildToolMap(catalog().getControllerTools());
		const target = resolveToolCallTarget(map, CALL_TOOL_TOOL_NAME, {
			tool: 'save_issue',
			arguments: { id: 'ENG-1' },
		});
		expect(target?.tool.name).toBe('save_issue');
		expect(target?.tool.approval?.required).toBe(true);
		expect(target?.input).toEqual({ id: 'ENG-1' });
		expect(target?.dispatchedBy?.name).toBe(CALL_TOOL_TOOL_NAME);
	});

	it('runs call_tool itself for an unknown tool, with suggestions', async () => {
		const map = buildToolMap(catalog().getControllerTools());
		const target = resolveToolCallTarget(map, CALL_TOOL_TOOL_NAME, { tool: 'send_messages' });
		expect(target?.tool.name).toBe(CALL_TOOL_TOOL_NAME);
		const result = await target!.tool.handler!(target!.input, {} as never);
		expect(result).toEqual(
			expect.objectContaining({ didYouMean: expect.arrayContaining(['send_message']) }),
		);
	});

	it('repairs a direct call to a tool from the tool catalog into a call_tool call', async () => {
		const map = buildToolMap(catalog().getControllerTools());
		const repaired = await fixToolCall(
			{
				toolCall: { toolCallId: 'tc-1', toolName: 'get_cell', input: '{"id":"c1"}' },
				error: { name: 'AI_NoSuchToolError' } as never,
			},
			map,
		);
		expect(repaired?.toolName).toBe(CALL_TOOL_TOOL_NAME);
		expect(JSON.parse(repaired!.input)).toEqual({ tool: 'get_cell', arguments: { id: 'c1' } });
	});

	it('leaves a direct call to an unknown tool unrepaired', async () => {
		const map = buildToolMap(catalog().getControllerTools());
		const repaired = await fixToolCall(
			{
				toolCall: { toolCallId: 'tc-1', toolName: 'not_a_tool', input: '{}' },
				error: { name: 'AI_NoSuchToolError' } as never,
			},
			map,
		);
		expect(repaired).toBeNull();
	});

	it('routes a tool catalog tool called by its own name through call_tool', () => {
		const map = buildToolMap(catalog().getControllerTools());
		const target = resolveToolCallTarget(map, 'get_cell', { id: 'c1' });
		expect(target?.tool.name).toBe('get_cell');
		expect(target?.dispatchedBy?.name).toBe(CALL_TOOL_TOOL_NAME);
		expect(resolveToolCallTarget(map, 'not_a_tool', {})).toBeUndefined();
	});

	it('shows tool group descriptions', () => {
		const described = new ToolCatalog(tools, {
			toolGroups: { send_message: 'slack' },
			toolGroupDescriptions: { slack: 'send and read Slack messages' },
		}).renderCatalog();
		expect(described).toContain('- slack (send and read Slack messages): send_message');
	});

	it('keeps tool names out of the system prompt rules', () => {
		const findTool = catalog()
			.getControllerTools()
			.find((tool) => tool.name === FIND_TOOLS_TOOL_NAME);
		expect(findTool?.systemInstruction).toBe(TOOL_CATALOG_GUIDANCE);
		expect(TOOL_CATALOG_GUIDANCE).not.toContain('save_issue');
	});

	it('names unloaded skills that use the tool group of the returned tools', async () => {
		const loaded = new Set<string>();
		const withSkills = new ToolCatalog(tools, {
			toolGroups: { list_issues: 'linear', save_issue: 'linear', send_message: 'slack' },
			unloadedSkillsForGroup: (group) =>
				group === 'linear' && !loaded.has('linear-triage') ? ['linear-triage'] : [],
		});
		const findTool = withSkills
			.getControllerTools()
			.find((tool) => tool.name === FIND_TOOLS_TOOL_NAME)!;

		const before = await findTool.handler!({ group: 'linear' }, {} as never);
		expect(before).toMatchObject({ skillsToLoad: ['linear-triage'] });
		expect(before).toHaveProperty('skillNote');

		expect(await findTool.handler!({ group: 'slack' }, {} as never)).not.toHaveProperty(
			'skillsToLoad',
		);

		loaded.add('linear-triage');
		expect(await findTool.handler!({ tools: ['list_issues'] }, {} as never)).not.toHaveProperty(
			'skillsToLoad',
		);
	});
});
