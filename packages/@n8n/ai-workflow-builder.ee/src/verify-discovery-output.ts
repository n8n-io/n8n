import { HumanMessage } from '@langchain/core/messages';

import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';

async function verify() {
	const subgraph = new DiscoverySubgraph();

	// Mock subgraph output state
	const mockSubgraphState = {
		nodesFound: [
			{ nodeType: { displayName: 'Test Node', name: 'testNode' } as any, reasoning: 'Because' },
		],
		requirements: ['Req 1'],
		constraints: ['Constraint 1'],
		dataNeeds: ['Data 1'],
		summary: 'Test summary',
		categorization: { techniques: ['Test'] as any, confidence: 0.9 },
		bestPractices: 'Test best practices',
		simplifiedWorkflow: { nodes: [], connections: [] },
		userRequest: 'Test request',
		messages: [],
		fetchedNodeTypes: new Map(),
		iterationCount: 1,
		supervisorInstructions: null,
	};

	// Mock parent state
	const mockParentState = {
		messages: [new HumanMessage('Test')],
		nextPhase: 'discovery',
		discoveryContext: null,
		workflowJSON: { nodes: [], connections: {}, name: '' },
		workflowContext: undefined,
		supervisorInstructions: null,
		finalResponse: '',
	};

	console.log('Testing transformOutput...');
	const result = subgraph.transformOutput(mockSubgraphState, mockParentState as any);

	console.log('Result:', JSON.stringify(result, null, 2));

	if (
		result.discoveryContext.categorization?.confidence === 0.9 &&
		result.discoveryContext.bestPractices === 'Test best practices'
	) {
		console.log('Verification PASSED: Discovery context correctly mapped to parent state.');
	} else {
		console.error('Verification FAILED: Data missing in parent state.');
		process.exit(1);
	}
}

verify().catch(console.error);
