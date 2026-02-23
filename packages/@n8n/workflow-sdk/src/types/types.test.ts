import type {
	WorkflowSettings,
	CredentialReference,
	NodeConfig,
	StickyNoteConfig,
	IConnections,
} from './base';
import { isNodeChain, isNodeInstance, normalizeConnections, generateUniqueName } from './base';

describe('Base Types', () => {
	describe('WorkflowSettings', () => {
		it('should support all workflow settings properties', () => {
			const settings: WorkflowSettings = {
				timezone: 'America/New_York',
				errorWorkflow: 'error-handler-123',
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'none',
				saveManualExecutions: true,
				saveExecutionProgress: false,
				executionTimeout: 3600,
				executionOrder: 'v1',
				callerPolicy: 'workflowsFromSameOwner',
				callerIds: 'workflow1,workflow2',
			};
			expect(settings.timezone).toBe('America/New_York');
			expect(settings.executionOrder).toBe('v1');
		});
	});

	describe('CredentialReference', () => {
		it('should have name and id properties', () => {
			const cred: CredentialReference = {
				name: 'My API Key',
				id: 'cred-123',
			};
			expect(cred.name).toBe('My API Key');
			expect(cred.id).toBe('cred-123');
		});
	});

	describe('NodeConfig', () => {
		it('should support all node configuration properties', () => {
			const config: NodeConfig = {
				parameters: { url: 'https://example.com' },
				credentials: { httpBasicAuth: { name: 'My Creds', id: '123' } },
				name: 'HTTP Request',
				position: [100, 200],
				disabled: false,
				notes: 'Fetches data from API',
				notesInFlow: true,
				executeOnce: false,
				retryOnFail: true,
				alwaysOutputData: true,
				onError: 'continueErrorOutput',
			};
			expect(config.parameters).toBeDefined();
			expect(config.onError).toBe('continueErrorOutput');
		});
	});

	describe('StickyNoteConfig', () => {
		it('should support sticky note configuration', () => {
			const config: StickyNoteConfig = {
				color: 4,
				position: [80, -176],
				width: 300,
				height: 200,
				name: 'My Note',
			};
			expect(config.color).toBe(4);
			expect(config.position).toEqual([80, -176]);
		});
	});

	describe('isNodeChain', () => {
		it('returns true for object with _isChain: true', () => {
			const chain = { _isChain: true as const, head: {}, tail: {}, allNodes: [] };
			expect(isNodeChain(chain)).toBe(true);
		});

		it('returns false for null', () => {
			expect(isNodeChain(null)).toBe(false);
		});

		it('returns false for non-object', () => {
			expect(isNodeChain('string')).toBe(false);
			expect(isNodeChain(123)).toBe(false);
			expect(isNodeChain(undefined)).toBe(false);
		});

		it('returns false for object without _isChain', () => {
			expect(isNodeChain({ head: {}, tail: {} })).toBe(false);
		});

		it('returns false for object with _isChain: false', () => {
			expect(isNodeChain({ _isChain: false })).toBe(false);
		});
	});

	describe('normalizeConnections', () => {
		it('converts flat tuple [node, type, index] to object format', () => {
			const connections: IConnections = {
				Trigger: {
					main: [['Process', 'main', 0] as unknown as null],
				},
			};

			normalizeConnections(connections);

			expect(connections.Trigger.main[0]).toEqual([{ node: 'Process', type: 'main', index: 0 }]);
		});

		it('defaults type to main and index to 0 for short tuples', () => {
			const connections: IConnections = {
				Trigger: {
					main: [['Process'] as unknown as null],
				},
			};

			normalizeConnections(connections);

			expect(connections.Trigger.main[0]).toEqual([{ node: 'Process', type: 'main', index: 0 }]);
		});

		it('preserves standard object format connections', () => {
			const connections: IConnections = {
				Trigger: {
					main: [[{ node: 'Process', type: 'main', index: 0 }]],
				},
			};

			normalizeConnections(connections);

			expect(connections.Trigger.main[0]).toEqual([{ node: 'Process', type: 'main', index: 0 }]);
		});

		it('skips null slots', () => {
			const connections: IConnections = {
				Trigger: {
					main: [null, [{ node: 'Process', type: 'main', index: 0 }]],
				},
			};

			normalizeConnections(connections);

			expect(connections.Trigger.main[0]).toBeNull();
			expect(connections.Trigger.main[1]).toEqual([{ node: 'Process', type: 'main', index: 0 }]);
		});

		it('does not treat arrays with >3 elements as flat tuples', () => {
			const connections: IConnections = {
				Trigger: {
					main: [
						[
							{ node: 'A', type: 'main', index: 0 },
							{ node: 'B', type: 'main', index: 0 },
							{ node: 'C', type: 'main', index: 0 },
							{ node: 'D', type: 'main', index: 0 },
						],
					],
				},
			};

			normalizeConnections(connections);

			// Should remain unchanged — 4-element arrays are not flat tuples
			expect(connections.Trigger.main[0]).toHaveLength(4);
		});
	});

	describe('generateUniqueName', () => {
		it('returns baseName with suffix 2 when baseName exists', () => {
			const existing = new Set(['HTTP']);
			expect(generateUniqueName('HTTP', (n) => existing.has(n))).toBe('HTTP 2');
		});

		it('increments suffix when lower suffixes exist', () => {
			const existing = new Set(['HTTP', 'HTTP 2', 'HTTP 3']);
			expect(generateUniqueName('HTTP', (n) => existing.has(n))).toBe('HTTP 4');
		});

		it('always starts checking at 2', () => {
			const existing = new Set(['HTTP']);
			// Should return "HTTP 2", not "HTTP 1"
			expect(generateUniqueName('HTTP', (n) => existing.has(n))).toBe('HTTP 2');
		});
	});

	describe('isNodeInstance', () => {
		it('returns true for object with type, version, config, and to function', () => {
			const node = {
				type: 'n8n-nodes-base.set',
				version: '1',
				config: {},
				to: () => {},
			};
			expect(isNodeInstance(node)).toBe(true);
		});

		it('returns false for null', () => {
			expect(isNodeInstance(null)).toBe(false);
		});

		it('returns false for non-object', () => {
			expect(isNodeInstance('string')).toBe(false);
			expect(isNodeInstance(123)).toBe(false);
		});

		it('returns false for object missing type', () => {
			const node = { version: '1', config: {}, then: () => {} };
			expect(isNodeInstance(node)).toBe(false);
		});

		it('returns false for object missing version', () => {
			const node = { type: 'test', config: {}, then: () => {} };
			expect(isNodeInstance(node)).toBe(false);
		});

		it('returns false for object missing config', () => {
			const node = { type: 'test', version: '1', then: () => {} };
			expect(isNodeInstance(node)).toBe(false);
		});

		it('returns false for object where then is not a function', () => {
			const node = { type: 'test', version: '1', config: {}, then: 'not a function' };
			expect(isNodeInstance(node)).toBe(false);
		});
	});
});
