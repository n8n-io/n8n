import { describe, it, expect } from 'vitest';

import { Agent, ToolSearchProcessor } from '../../index';
import type { ToolDescriptor, ToolRepository } from '../../index';
import type { BuiltTool } from '../../types/sdk/tool';
import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	findAllToolCalls,
	findAllToolResults,
	getModel,
} from './helpers';

// ---------------------------------------------------------------------------
// In-memory repository seeded with realistic node-like tool descriptors
// ---------------------------------------------------------------------------

class InMemoryToolRepository implements ToolRepository {
	private readonly tools: Map<string, { descriptor: ToolDescriptor; tool: BuiltTool }> = new Map();

	add(descriptor: ToolDescriptor, tool: BuiltTool): this {
		this.tools.set(descriptor.name, { descriptor, tool });
		return this;
	}

	async listTools(): Promise<ToolDescriptor[]> {
		return Array.from(this.tools.values()).map((e) => e.descriptor);
	}

	async getTool(name: string): Promise<BuiltTool | undefined> {
		return this.tools.get(name)?.tool;
	}
}

function buildRepository(): InMemoryToolRepository {
	const repo = new InMemoryToolRepository();

	const tools: Array<{ name: string; description: string }> = [
		{
			name: 'n8n-nodes-base.slack',
			description: 'Send messages to Slack channels, create channels, and manage Slack workspaces.',
		},
		{
			name: 'n8n-nodes-base.gmail',
			description: 'Send and receive emails via Gmail, manage labels, drafts, and threads.',
		},
		{
			name: 'n8n-nodes-base.github',
			description: 'Interact with GitHub repositories, issues, pull requests, and releases.',
		},
		{
			name: 'n8n-nodes-base.googleCalendar',
			description: 'Create, update, and delete Google Calendar events and manage calendars.',
		},
		{
			name: 'n8n-nodes-base.notion',
			description: 'Create and update pages, databases, and blocks in Notion.',
		},
		{
			name: 'n8n-nodes-base.jira',
			description: 'Create and manage Jira issues, projects, sprints, and workflows.',
		},
		{
			name: 'n8n-nodes-base.airtable',
			description: 'Read, create, update, and delete records in Airtable bases.',
		},
	];

	for (const { name, description } of tools) {
		repo.add(
			{ name, description, hasCredentials: true },
			{
				name,
				description,
				handler: async (input) => ({ executed: true, node: name, input }),
			},
		);
	}

	return repo;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const describe_ = describeIf('anthropic');

describe_('ToolSearchProcessor + Agent — end-to-end with real LLM', () => {
	it('agent calls search_tools and then load_tool to discover and load a tool', async () => {
		const loadedTools: BuiltTool[] = [];
		const agent = new Agent('tool-discovery-agent').model(getModel('anthropic'));

		const processor = new ToolSearchProcessor({
			repository: buildRepository(),
			onToolLoaded: (tool) => {
				loadedTools.push(tool);
				agent.tool(tool);
			},
		});

		agent
			.instructions(
				'You are a workflow automation assistant. ' +
					'When asked to perform a task, use search_tools to find the right tool, ' +
					'then use load_tool to activate it. ' +
					'Always call search_tools first, then load_tool. Be concise.',
			)
			.tool(processor.metaTools);

		const { stream } = await agent.stream(
			'I need to send a message to a Slack channel. Find and load the right tool.',
		);

		const chunks = await collectStreamChunks(stream);
		const messages = chunksOfType(chunks, 'message').map((c) => c.message);
		const toolCalls = findAllToolCalls(messages);
		const toolResults = findAllToolResults(messages);

		// Agent must have called search_tools
		const searchCall = toolCalls.find((tc) => tc.toolName === 'search_tools');
		expect(searchCall).toBeDefined();

		// Agent must have called load_tool
		const loadCall = toolCalls.find((tc) => tc.toolName === 'load_tool');
		expect(loadCall).toBeDefined();

		// load_tool must have succeeded
		const loadResult = toolResults.find((tr) => tr.toolName === 'load_tool');
		expect(loadResult).toBeDefined();
		expect((loadResult!.result as { success: boolean }).success).toBe(true);

		// The slack tool must have been injected via onToolLoaded
		expect(loadedTools.some((t) => t.name === 'n8n-nodes-base.slack')).toBe(true);
	});

	it('agent uses the loaded tool in a follow-up turn after loading it', async () => {
		const loadedTools: BuiltTool[] = [];
		const agent = new Agent('tool-use-agent').model(getModel('anthropic'));

		const processor = new ToolSearchProcessor({
			repository: buildRepository(),
			onToolLoaded: (tool) => {
				loadedTools.push(tool);
				agent.tool(tool);
			},
		});

		agent
			.instructions(
				'You are a workflow automation assistant. ' +
					'Step 1: use search_tools to find a tool for the task. ' +
					'Step 2: use load_tool to activate it. ' +
					'Step 3: immediately use the loaded tool to complete the task. ' +
					'Be concise and complete all three steps.',
			)
			.tool(processor.metaTools);

		const { stream } = await agent.stream(
			'Send a Slack message "Hello world" to the #general channel. ' +
				'Search for the tool, load it, then use it.',
		);

		const chunks = await collectStreamChunks(stream);
		const messages = chunksOfType(chunks, 'message').map((c) => c.message);
		const toolCalls = findAllToolCalls(messages);

		// All three tool calls must be present
		expect(toolCalls.some((tc) => tc.toolName === 'search_tools')).toBe(true);
		expect(toolCalls.some((tc) => tc.toolName === 'load_tool')).toBe(true);
		expect(toolCalls.some((tc) => tc.toolName === 'n8n-nodes-base.slack')).toBe(true);

		// The slack tool was injected
		expect(loadedTools.some((t) => t.name === 'n8n-nodes-base.slack')).toBe(true);
	});
});
