import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IConnections } from 'n8n-workflow';

import {
	partitionWarnings,
	topLevelItemsWarning,
	type ValidationWarning,
} from '../workflow-validation-warnings';

describe('partitionWarnings', () => {
	it('keeps informational severity soft and treats other issues as blocking', () => {
		const warnings: ValidationWarning[] = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger', severity: 'informational' },
			{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected', severity: 'informational' },
			{
				code: 'INVALID_PARAMETER',
				message: 'Bad parameter',
				nodeName: 'HTTP Request',
				severity: 'warning',
			},
		];

		expect(partitionWarnings(warnings)).toEqual({
			informational: warnings.slice(0, 2),
			blocking: [warnings[2]],
		});
	});

	it('treats missing severity as blocking', () => {
		const warnings: ValidationWarning[] = [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown key' }];
		expect(partitionWarnings(warnings)).toEqual({
			informational: [],
			blocking: warnings,
		});
	});
});

describe('topLevelItemsWarning', () => {
	const node = (name: string, type = 'n8n-nodes-base.noOp') => ({
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0] as [number, number],
	});

	const workflow = (nodes: string[], extra: Partial<WorkflowJSON> = {}): WorkflowJSON => ({
		name: 'wf',
		nodes: nodes.map((n) => node(n)),
		connections: {},
		...extra,
	});

	it('says nothing while the canvas is at or under the ceiling', () => {
		expect(topLevelItemsWarning(workflow(['a', 'b', 'c', 'd', 'e', 'f', 'g']))).toBeUndefined();
	});

	it('names the count and the ungrouped nodes once the canvas goes over', () => {
		const warning = topLevelItemsWarning(workflow(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']));

		expect(warning?.code).toBe('TOP_LEVEL_ITEMS_OVER_CEILING');
		expect(warning?.severity).toBe('informational');
		expect(warning?.message).toContain('8 boxes');
		expect(warning?.message).toContain('a, b, c, d, e, f, g, h');
	});

	it('counts the trigger but leaves it out of the list, since no group can hold one', () => {
		const withTrigger: WorkflowJSON = {
			name: 'wf',
			connections: {},
			nodes: [
				node('When chat message received', 'n8n-nodes-base.chatTrigger'),
				...['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((n) => node(n)),
			],
		};

		const warning = topLevelItemsWarning(withTrigger);

		expect(warning?.message).toContain('8 boxes');
		expect(warning?.message).toContain('a, b, c, d, e, f, g');
		expect(warning?.message).not.toContain('When chat message received');
	});

	it('counts a group as one box', () => {
		const grouped = workflow(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], {
			nodeGroups: [{ id: 'g1', name: 'Stage', nodeIds: ['a', 'b', 'c'] }],
		});

		// 1 group + 5 ungrouped nodes.
		expect(topLevelItemsWarning(grouped)).toBeUndefined();
	});

	it('counts an agent and its sub-nodes as one box', () => {
		// Sub-nodes reach their parent over non-main connections only, so they are not
		// boxes the agent could group away.
		const connections: IConnections = {
			Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			Agent: { main: [[{ node: 'a', type: 'main', index: 0 }]] },
		};
		const withAgent = workflow(['Agent', 'Model', 'Memory', 'Tool', 'a', 'b', 'c', 'd', 'e', 'f'], {
			connections,
		});

		// Agent + 6 plain nodes = 7 boxes; the three sub-nodes do not count.
		expect(topLevelItemsWarning(withAgent)).toBeUndefined();
	});

	it('does not count sticky notes', () => {
		const withSticky: WorkflowJSON = {
			name: 'wf',
			connections: {},
			nodes: [
				...['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((n) => node(n)),
				node('Note', 'n8n-nodes-base.stickyNote'),
			],
		};

		expect(topLevelItemsWarning(withSticky)).toBeUndefined();
	});
});
