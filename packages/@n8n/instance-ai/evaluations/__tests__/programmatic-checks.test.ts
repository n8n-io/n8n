import {
	checkNodeExists,
	checkNodeConnected,
	checkTriggerType,
	checkNodeCountGte,
	checkConnectionExists,
	checkNodeParameter,
	runProgrammaticCheck,
} from '../checklist/programmatic-checks';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const sampleWorkflow: Record<string, unknown> = {
	nodes: [
		{
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			parameters: { path: 'contacts', httpMethod: 'POST' },
		},
		{
			name: 'IF',
			type: 'n8n-nodes-base.if',
			parameters: { conditions: { string: [{ value1: '={{$json.email}}' }] } },
		},
		{
			name: 'Set',
			type: 'n8n-nodes-base.set',
			parameters: { values: { string: [{ name: 'status', value: 'valid' }] } },
		},
	],
	connections: {
		Webhook: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
		IF: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
	},
};

const emptyWorkflow: Record<string, unknown> = {
	nodes: [],
	connections: {},
};

// ---------------------------------------------------------------------------
// checkNodeExists
// ---------------------------------------------------------------------------

describe('checkNodeExists', () => {
	it('passes when the node type exists', () => {
		const result = checkNodeExists(sampleWorkflow, { nodeType: 'n8n-nodes-base.webhook' });
		expect(result.pass).toBe(true);
		expect(result.reasoning).toContain('n8n-nodes-base.webhook');
	});

	it('fails when the node type does not exist', () => {
		const result = checkNodeExists(sampleWorkflow, { nodeType: 'n8n-nodes-base.slack' });
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('No node of type');
	});

	it('fails on empty workflow', () => {
		const result = checkNodeExists(emptyWorkflow, { nodeType: 'n8n-nodes-base.webhook' });
		expect(result.pass).toBe(false);
	});

	it('handles missing nodes array', () => {
		const result = checkNodeExists({}, { nodeType: 'n8n-nodes-base.webhook' });
		expect(result.pass).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// checkNodeConnected
// ---------------------------------------------------------------------------

describe('checkNodeConnected', () => {
	it('passes when the node has outgoing connections', () => {
		const result = checkNodeConnected(sampleWorkflow, { nodeType: 'n8n-nodes-base.webhook' });
		expect(result.pass).toBe(true);
		expect(result.reasoning).toContain('outgoing connections');
	});

	it('passes when the node has incoming connections', () => {
		const result = checkNodeConnected(sampleWorkflow, { nodeType: 'n8n-nodes-base.set' });
		expect(result.pass).toBe(true);
		expect(result.reasoning).toContain('incoming connections');
	});

	it('fails when the node type does not exist', () => {
		const result = checkNodeConnected(sampleWorkflow, { nodeType: 'n8n-nodes-base.slack' });
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('No node of type');
	});

	it('fails when the node exists but is not connected', () => {
		const disconnectedWorkflow = {
			nodes: [
				{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} },
				{ name: 'Code', type: 'n8n-nodes-base.code', parameters: {} },
			],
			connections: {},
		};
		const result = checkNodeConnected(disconnectedWorkflow, { nodeType: 'n8n-nodes-base.code' });
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('not connected');
	});
});

// ---------------------------------------------------------------------------
// checkTriggerType
// ---------------------------------------------------------------------------

describe('checkTriggerType', () => {
	it('passes when the trigger type matches exactly', () => {
		const result = checkTriggerType(sampleWorkflow, {
			expectedTriggerType: 'n8n-nodes-base.webhook',
		});
		expect(result.pass).toBe(true);
	});

	it('fails when trigger type does not match', () => {
		const workflowWithTrigger = {
			nodes: [
				{ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', parameters: {} },
				{ name: 'Set', type: 'n8n-nodes-base.set', parameters: {} },
			],
			connections: {},
		};
		const result = checkTriggerType(workflowWithTrigger, {
			expectedTriggerType: 'n8n-nodes-base.webhook',
		});
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('n8n-nodes-base.manualTrigger');
	});

	it('fails when no trigger node exists', () => {
		const noTriggerWorkflow = {
			nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', parameters: {} }],
			connections: {},
		};
		const result = checkTriggerType(noTriggerWorkflow, {
			expectedTriggerType: 'n8n-nodes-base.webhook',
		});
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('No trigger node found');
	});
});

// ---------------------------------------------------------------------------
// checkNodeCountGte
// ---------------------------------------------------------------------------

describe('checkNodeCountGte', () => {
	it('passes when node count meets minimum', () => {
		const result = checkNodeCountGte(sampleWorkflow, { minCount: 3 });
		expect(result.pass).toBe(true);
		expect(result.reasoning).toContain('3 node(s)');
	});

	it('passes when node count exceeds minimum', () => {
		const result = checkNodeCountGte(sampleWorkflow, { minCount: 2 });
		expect(result.pass).toBe(true);
	});

	it('fails when node count is below minimum', () => {
		const result = checkNodeCountGte(sampleWorkflow, { minCount: 5 });
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('expected at least 5');
	});

	it('handles empty workflow', () => {
		const result = checkNodeCountGte(emptyWorkflow, { minCount: 1 });
		expect(result.pass).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// checkConnectionExists
// ---------------------------------------------------------------------------

describe('checkConnectionExists', () => {
	it('passes when connection exists between node types', () => {
		const result = checkConnectionExists(sampleWorkflow, {
			sourceNodeType: 'n8n-nodes-base.webhook',
			targetNodeType: 'n8n-nodes-base.if',
		});
		expect(result.pass).toBe(true);
		expect(result.reasoning).toContain('Found connection');
	});

	it('fails when source node type is missing', () => {
		const result = checkConnectionExists(sampleWorkflow, {
			sourceNodeType: 'n8n-nodes-base.slack',
			targetNodeType: 'n8n-nodes-base.if',
		});
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('No source node');
	});

	it('fails when target node type is missing', () => {
		const result = checkConnectionExists(sampleWorkflow, {
			sourceNodeType: 'n8n-nodes-base.webhook',
			targetNodeType: 'n8n-nodes-base.slack',
		});
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('No target node');
	});

	it('fails when no direct connection exists', () => {
		const result = checkConnectionExists(sampleWorkflow, {
			sourceNodeType: 'n8n-nodes-base.webhook',
			targetNodeType: 'n8n-nodes-base.set',
		});
		// Webhook connects to IF, not directly to Set
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('No connection found');
	});
});

// ---------------------------------------------------------------------------
// checkNodeParameter
// ---------------------------------------------------------------------------

describe('checkNodeParameter', () => {
	it('passes when parameter matches', () => {
		const result = checkNodeParameter(sampleWorkflow, {
			nodeType: 'n8n-nodes-base.webhook',
			parameterPath: 'path',
			expectedValue: 'contacts',
		});
		expect(result.pass).toBe(true);
	});

	it('passes with nested parameter path', () => {
		const result = checkNodeParameter(sampleWorkflow, {
			nodeType: 'n8n-nodes-base.webhook',
			parameterPath: 'httpMethod',
			expectedValue: 'POST',
		});
		expect(result.pass).toBe(true);
	});

	it('fails when parameter does not match', () => {
		const result = checkNodeParameter(sampleWorkflow, {
			nodeType: 'n8n-nodes-base.webhook',
			parameterPath: 'path',
			expectedValue: 'orders',
		});
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('does not match');
	});

	it('fails when node type does not exist', () => {
		const result = checkNodeParameter(sampleWorkflow, {
			nodeType: 'n8n-nodes-base.slack',
			parameterPath: 'channel',
			expectedValue: '#general',
		});
		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('No node of type');
	});

	it('fails when parameter path does not exist', () => {
		const result = checkNodeParameter(sampleWorkflow, {
			nodeType: 'n8n-nodes-base.webhook',
			parameterPath: 'nonExistent',
			expectedValue: 'anything',
		});
		expect(result.pass).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// runProgrammaticCheck (dispatcher)
// ---------------------------------------------------------------------------

describe('runProgrammaticCheck', () => {
	it('dispatches node-exists check', () => {
		const result = runProgrammaticCheck(sampleWorkflow, {
			type: 'node-exists',
			nodeType: 'n8n-nodes-base.webhook',
		});
		expect(result.pass).toBe(true);
	});

	it('dispatches node-connected check', () => {
		const result = runProgrammaticCheck(sampleWorkflow, {
			type: 'node-connected',
			nodeType: 'n8n-nodes-base.if',
		});
		expect(result.pass).toBe(true);
	});

	it('dispatches trigger-type check', () => {
		const result = runProgrammaticCheck(sampleWorkflow, {
			type: 'trigger-type',
			expectedTriggerType: 'n8n-nodes-base.webhook',
		});
		expect(result.pass).toBe(true);
	});

	it('dispatches node-count-gte check', () => {
		const result = runProgrammaticCheck(sampleWorkflow, {
			type: 'node-count-gte',
			minCount: 3,
		});
		expect(result.pass).toBe(true);
	});

	it('dispatches connection-exists check', () => {
		const result = runProgrammaticCheck(sampleWorkflow, {
			type: 'connection-exists',
			sourceNodeType: 'n8n-nodes-base.webhook',
			targetNodeType: 'n8n-nodes-base.if',
		});
		expect(result.pass).toBe(true);
	});

	it('dispatches node-parameter check', () => {
		const result = runProgrammaticCheck(sampleWorkflow, {
			type: 'node-parameter',
			nodeType: 'n8n-nodes-base.webhook',
			parameterPath: 'path',
			expectedValue: 'contacts',
		});
		expect(result.pass).toBe(true);
	});
});
