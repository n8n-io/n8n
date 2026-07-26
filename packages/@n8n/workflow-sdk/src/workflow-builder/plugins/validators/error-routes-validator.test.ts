import { errorRoutesValidator } from './error-routes-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: Record<string, unknown> = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '4.2',
		config,
	} as NodeInstance<string, string, unknown>;
}

function conn(node: string): ConnectionTarget {
	return { node, type: 'main', index: 0 };
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	mainOutputs: Map<number, ConnectionTarget[]> = new Map(),
): GraphNode {
	const connections = new Map<string, Map<number, ConnectionTarget[]>>();
	if (mainOutputs.size > 0) {
		connections.set('main', mainOutputs);
	}
	return { instance: node, connections };
}

function createContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('errorRoutesValidator', () => {
	it('has correct id', () => {
		expect(errorRoutesValidator.id).toBe('core:error-routes');
	});

	it('flags continueErrorOutput with no error handler wired', () => {
		const node = createMockNode('n8n-nodes-base.httpRequest', 'Forward to CRM', {
			onError: 'continueErrorOutput',
		});
		const issues = errorRoutesValidator.validateNode(node, createGraphNode(node), createContext());
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('ERROR_OUTPUT_NOT_WIRED');
		expect(issues[0].message).toContain('main[1]');
	});

	it('accepts HTTP node with success on main[0] and error handler on main[1]', () => {
		const node = createMockNode('n8n-nodes-base.httpRequest', 'Forward to CRM', {
			onError: 'continueErrorOutput',
		});
		expect(
			errorRoutesValidator.validateNode(
				node,
				createGraphNode(
					node,
					new Map([
						[0, [conn('Save Sheet')]],
						[1, [conn('Log CRM Error')]],
					]),
				),
				createContext(),
			),
		).toEqual([]);
	});

	it('flags handler wired only to success output instead of error pin', () => {
		const node = createMockNode('n8n-nodes-base.httpRequest', 'Forward to CRM', {
			onError: 'continueErrorOutput',
		});
		const issues = errorRoutesValidator.validateNode(
			node,
			createGraphNode(node, new Map([[0, [conn('Log CRM Error')]]])),
			createContext(),
		);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('ERROR_OUTPUT_MISROUTED');
		expect(issues[0].message).toContain('.onError(handler)');
	});

	it('flags connection from main[1] when onError is not set', () => {
		const node = createMockNode('n8n-nodes-base.httpRequest', 'Forward to CRM');
		const issues = errorRoutesValidator.validateNode(
			node,
			createGraphNode(node, new Map([[1, [conn('Log CRM Error')]]])),
			createContext(),
		);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('ERROR_OUTPUT_INVALID_PORT');
	});

	it('accepts IF with both branches wired and no onError', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Route');
		expect(
			errorRoutesValidator.validateNode(
				node,
				createGraphNode(
					node,
					new Map([
						[0, [conn('True Path')]],
						[1, [conn('False Path')]],
					]),
				),
				createContext(),
			),
		).toEqual([]);
	});

	it('flags IF with continueErrorOutput when error pin main[2] is unwired', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Route', {
			onError: 'continueErrorOutput',
		});
		const issues = errorRoutesValidator.validateNode(
			node,
			createGraphNode(
				node,
				new Map([
					[0, [conn('True Path')]],
					[1, [conn('False Path')]],
				]),
			),
			createContext(),
		);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('ERROR_OUTPUT_NOT_WIRED');
		expect(issues[0].message).toContain('main[2]');
	});

	it('accepts IF with continueErrorOutput when error pin main[2] is wired', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Route', {
			onError: 'continueErrorOutput',
		});
		expect(
			errorRoutesValidator.validateNode(
				node,
				createGraphNode(
					node,
					new Map([
						[0, [conn('True Path')]],
						[1, [conn('False Path')]],
						[2, [conn('Log Error')]],
					]),
				),
				createContext(),
			),
		).toEqual([]);
	});
});
