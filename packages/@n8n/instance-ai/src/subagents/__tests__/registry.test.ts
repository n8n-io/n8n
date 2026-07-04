import type { BuiltTool } from '@n8n/agents';

import { executeTool } from '../../__tests__/tool-test-utils';
import { createToolRegistry } from '../../tool-registry';
import { ASK_USER_TOOL_ID, DOMAIN_TOOL_IDS } from '../../tools/tool-ids';
import type { OrchestrationContext } from '../../types';
import {
	buildSubAgentInstructions,
	GENERAL_PURPOSE_SUB_AGENT_ID,
	getGeneralPurposeSubAgentDefinition,
	getSubAgentDefinition,
	listAvailableSubAgents,
	listSubAgentIds,
	resolveSubAgentTools,
} from '../registry';
import type { InstanceAiSubAgentDefinition } from '../types';

function createMockContext(domainTools: Record<string, BuiltTool>): OrchestrationContext {
	return {
		domainTools: createToolRegistry(Object.entries(domainTools)),
	} as unknown as OrchestrationContext;
}

function createStubTool(name: string): BuiltTool {
	return {
		name,
		description: name,
		handler: async (input) => await Promise.resolve({ ok: true, input }),
	};
}

describe('getSubAgentDefinition', () => {
	it('resolves all v1 built-ins by id', () => {
		expect(getSubAgentDefinition('general-purpose')?.id).toBe('general-purpose');
		expect(getSubAgentDefinition('workflow-context-scout')?.id).toBe('workflow-context-scout');
		expect(getSubAgentDefinition('instance-explorer')?.id).toBe('instance-explorer');
		expect(getSubAgentDefinition('execution-debugger')?.id).toBe('execution-debugger');
	});

	it('returns undefined for an unknown id', () => {
		expect(getSubAgentDefinition('does-not-exist')).toBeUndefined();
	});
});

describe('getGeneralPurposeSubAgentDefinition', () => {
	it('returns the definition inline resolves to', () => {
		const definition = getGeneralPurposeSubAgentDefinition();
		expect(definition.id).toBe(GENERAL_PURPOSE_SUB_AGENT_ID);
	});
});

describe('listSubAgentIds', () => {
	it('lists every registered id, including hidden ones', () => {
		const ids = listSubAgentIds();
		expect(ids).toEqual(
			expect.arrayContaining([
				'general-purpose',
				'workflow-context-scout',
				'instance-explorer',
				'execution-debugger',
			]),
		);
	});
});

describe('listAvailableSubAgents', () => {
	it('excludes general-purpose from the delegate listing but includes workflow-context-scout', () => {
		const ids = listAvailableSubAgents().map((entry) => entry.id);
		expect(ids).not.toContain('general-purpose');
		expect(ids).toContain('workflow-context-scout');
		expect(ids).toEqual(expect.arrayContaining(['instance-explorer', 'execution-debugger']));
	});

	it('only exposes id, name, and useWhen', () => {
		const entries = listAvailableSubAgents();
		for (const entry of entries) {
			expect(Object.keys(entry).sort()).toEqual(['id', 'name', 'useWhen']);
		}
	});
});

describe('buildSubAgentInstructions', () => {
	it('appends the no-HITL note when hitl is blocked', () => {
		const definition: InstanceAiSubAgentDefinition = {
			id: 'test',
			name: 'Test',
			useWhen: 'test',
			maxSteps: 5,
			hitl: 'blocked',
			tools: ['nodes'],
			instructions: 'Base instructions.',
		};

		const instructions = buildSubAgentInstructions(definition);
		expect(instructions).toContain('Base instructions.');
		expect(instructions).toContain('You cannot ask the user for input');
	});

	it('leaves instructions untouched when hitl is allowed', () => {
		const definition: InstanceAiSubAgentDefinition = {
			id: 'test',
			name: 'Test',
			useWhen: 'test',
			maxSteps: 5,
			hitl: 'allowed',
			tools: ['nodes'],
			instructions: 'Base instructions.',
		};

		expect(buildSubAgentInstructions(definition)).toBe('Base instructions.');
	});
});

describe('resolveSubAgentTools', () => {
	it('resolves plain-string tool scopes as-is', () => {
		const context = createMockContext({ nodes: createStubTool('nodes') });
		const definition = getSubAgentDefinition('workflow-context-scout');
		if (!definition) throw new Error('missing definition');

		const { toolNames } = resolveSubAgentTools(definition, context);
		expect(toolNames).toContain('nodes');
	});

	it('blocks type-definition on the workflow-context-scout nodes tool', async () => {
		const context = createMockContext({ nodes: createStubTool('nodes') });
		const definition = getSubAgentDefinition('workflow-context-scout');
		if (!definition) throw new Error('missing definition');

		const { tools } = resolveSubAgentTools(definition, context);
		const wrapped = tools.get(DOMAIN_TOOL_IDS.NODES);
		if (!wrapped) throw new Error('nodes tool missing');

		const output = await executeTool<{ error: string }>(wrapped, {
			action: 'type-definition',
			nodeTypes: ['n8n-nodes-base.gmail'],
		});
		expect(output.error).toContain('Action "type-definition" is not permitted');
		expect(output.error).toContain('search, suggested');
	});

	it('skips tools that are not present in the orchestration context', () => {
		const context = createMockContext({});
		const definition = getSubAgentDefinition('workflow-context-scout');
		if (!definition) throw new Error('missing definition');

		const { toolNames } = resolveSubAgentTools(definition, context);
		expect(toolNames).toEqual([]);
	});

	it('rejects actions outside the allowlist for action-scoped tools', async () => {
		const context = createMockContext({ workflows: createStubTool('workflows') });
		const definition: InstanceAiSubAgentDefinition = {
			id: 'test',
			name: 'Test',
			useWhen: 'test',
			maxSteps: 5,
			hitl: 'blocked',
			tools: [{ id: DOMAIN_TOOL_IDS.WORKFLOWS, actions: ['list', 'get'] }],
			instructions: 'Base instructions.',
		};

		const { tools } = resolveSubAgentTools(definition, context);
		const wrapped = tools.get(DOMAIN_TOOL_IDS.WORKFLOWS);
		if (!wrapped) throw new Error('workflows tool missing');

		const output = await executeTool<{ error: string }>(wrapped, { action: 'delete' });
		expect(output.error).toContain('Action "delete" is not permitted');
		expect(output.error).toContain('list, get');
	});

	it('allows in-allowlist actions through to the underlying tool', async () => {
		const context = createMockContext({ workflows: createStubTool('workflows') });
		const definition: InstanceAiSubAgentDefinition = {
			id: 'test',
			name: 'Test',
			useWhen: 'test',
			maxSteps: 5,
			hitl: 'blocked',
			tools: [{ id: DOMAIN_TOOL_IDS.WORKFLOWS, actions: ['list', 'get'] }],
			instructions: 'Base instructions.',
		};

		const { tools } = resolveSubAgentTools(definition, context);
		const wrapped = tools.get(DOMAIN_TOOL_IDS.WORKFLOWS);
		if (!wrapped) throw new Error('workflows tool missing');

		const output = await executeTool<{ ok: boolean }>(wrapped, { action: 'list' });
		expect(output.ok).toBe(true);
	});

	it('strips ask-user from resolved tools when hitl is blocked, even if listed', () => {
		const context = createMockContext({
			nodes: createStubTool('nodes'),
			[ASK_USER_TOOL_ID]: createStubTool(ASK_USER_TOOL_ID),
		});
		const definition: InstanceAiSubAgentDefinition = {
			id: 'test',
			name: 'Test',
			useWhen: 'test',
			maxSteps: 5,
			hitl: 'blocked',
			tools: ['nodes', ASK_USER_TOOL_ID],
			instructions: 'Base instructions.',
		};

		const { toolNames } = resolveSubAgentTools(definition, context);
		expect(toolNames).toContain('nodes');
		expect(toolNames).not.toContain(ASK_USER_TOOL_ID);
	});

	it('keeps ask-user available when hitl is allowed and the tool is listed', () => {
		const context = createMockContext({
			[ASK_USER_TOOL_ID]: createStubTool(ASK_USER_TOOL_ID),
		});
		const definition: InstanceAiSubAgentDefinition = {
			id: 'test',
			name: 'Test',
			useWhen: 'test',
			maxSteps: 5,
			hitl: 'allowed',
			tools: [ASK_USER_TOOL_ID],
			instructions: 'Base instructions.',
		};

		const { toolNames } = resolveSubAgentTools(definition, context);
		expect(toolNames).toContain(ASK_USER_TOOL_ID);
	});
});
