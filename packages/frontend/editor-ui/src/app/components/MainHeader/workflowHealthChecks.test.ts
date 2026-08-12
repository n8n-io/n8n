import { describe, it, expect } from 'vitest';
import type { INodeConnections } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { createTestNode } from '@/__tests__/mocks';
import {
	ERROR_TRIGGER_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	HTTP_REQUEST_TOOL_NODE_TYPE,
} from '@/app/constants';
import { findNodesMissingErrorHandling } from './workflowHealthChecks';

const httpNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({ name: 'HTTP Request', type: HTTP_REQUEST_NODE_TYPE, ...overrides });

// Name-sensitive so an implementation looking up by node.id or a constant fails
const incomingMain = (nodeName: string): INodeConnections =>
	nodeName === 'HTTP Request' ? { main: [[{ node: 'X', type: 'main' as const, index: 0 }]] } : {};
const outgoingAiTool: () => INodeConnections = () => ({
	ai_tool: [[{ node: 'Agent', type: 'ai_tool' as const, index: 0 }]],
});
const noConnections: () => INodeConnections = () => ({});

type Deps = Parameters<typeof findNodesMissingErrorHandling>[0];

function findIssues(nodes: INodeUi[], overrides: Partial<Deps> = {}) {
	return findNodesMissingErrorHandling({
		nodes,
		errorWorkflow: undefined,
		outgoingConnectionsByNodeName: noConnections,
		incomingConnectionsByNodeName: incomingMain,
		...overrides,
	});
}

describe('findNodesMissingErrorHandling', () => {
	it('flags a connected HTTP Request node with no error handling configured', () => {
		const node = httpNode();

		expect(findIssues([node])).toEqual([node]);
	});

	it('flags an HTTP Request Tool node connected only via an ai_tool output', () => {
		const node = httpNode({ type: HTTP_REQUEST_TOOL_NODE_TYPE });

		expect(
			findIssues([node], {
				outgoingConnectionsByNodeName: outgoingAiTool,
				incomingConnectionsByNodeName: noConnections,
			}),
		).toEqual([node]);
	});

	it.each([undefined, '', 'DEFAULT'])(
		'still flags when the error workflow setting is %j',
		(errorWorkflow) => {
			expect(findIssues([httpNode()], { errorWorkflow })).toHaveLength(1);
		},
	);

	it('flags nothing when a real error workflow is configured', () => {
		expect(findIssues([httpNode()], { errorWorkflow: 'wf-123' })).toEqual([]);
	});

	it('flags nothing when the workflow contains an Error Trigger node', () => {
		const errorTrigger = createTestNode({ name: 'Error Trigger', type: ERROR_TRIGGER_NODE_TYPE });

		expect(findIssues([httpNode(), errorTrigger])).toEqual([]);
	});

	it('skips non-HTTP node types', () => {
		expect(findIssues([httpNode({ type: 'n8n-nodes-base.set' })])).toEqual([]);
	});

	it('skips disabled nodes', () => {
		expect(findIssues([httpNode({ disabled: true })])).toEqual([]);
	});

	it('skips unconnected nodes', () => {
		expect(findIssues([httpNode()], { incomingConnectionsByNodeName: noConnections })).toEqual([]);
	});

	it.each([
		['retryOnFail enabled', { retryOnFail: true }],
		['continueOnFail enabled', { continueOnFail: true }],
		['onError set to continue on regular output', { onError: 'continueRegularOutput' }],
		['onError set to continue on error output', { onError: 'continueErrorOutput' }],
	] as Array<[string, Partial<INodeUi>]>)('does not flag a node with %s', (_label, overrides) => {
		expect(findIssues([httpNode(overrides)])).toEqual([]);
	});

	it('still flags a node with onError explicitly set to stopWorkflow', () => {
		const node = httpNode({ onError: 'stopWorkflow' });

		expect(findIssues([node])).toEqual([node]);
	});

	it('returns nothing for an empty workflow', () => {
		expect(findIssues([])).toEqual([]);
	});
});
