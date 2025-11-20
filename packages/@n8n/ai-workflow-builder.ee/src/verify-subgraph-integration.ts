import { HumanMessage } from '@langchain/core/messages';

import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { ConfiguratorSubgraph } from './subgraphs/configurator.subgraph';

async function verify() {
	const builderSubgraph = new BuilderSubgraph();
	const configuratorSubgraph = new ConfiguratorSubgraph();

	// Mock parent state with discovery results
	const mockParentState = {
		messages: [new HumanMessage('Create a weather workflow')],
		next: 'builder',
		discoveryContext: {
			nodesFound: [
				{
					nodeType: { displayName: 'HTTP Request', name: 'n8n-nodes-base.httpRequest' } as any,
					reasoning: 'Needed for API',
				},
			],
			relevantContext: [
				{ context: 'Builder context', relevancy: 'builder' as const },
				{ context: 'Configurator context', relevancy: 'configurator' as const },
			],
			summary: 'A weather workflow',
			categorization: { techniques: ['API Integration'], confidence: 0.95 },
			bestPractices: 'Use error handling',
		},
		builderResults: {},
		configuratorResults: {},
		userRequest: 'Create a weather workflow',
		supervisorInstructions: null,
		iteration: 1,
		workflowJSON: { nodes: [], connections: {}, name: '' },
		workflowContext: undefined,
	};

	console.log('Testing BuilderSubgraph.transformInput...');
	const builderInput = builderSubgraph.transformInput(mockParentState as any);

	console.log('Builder Input Request:', builderInput.userRequest);

	if (
		builderInput.userRequest.includes('Categorization: API Integration') &&
		builderInput.userRequest.includes('Best Practices:\nUse error handling') &&
		builderInput.userRequest.includes('Builder context')
	) {
		console.log('✅ Builder Subgraph correctly received discovery context.');
	} else {
		console.error('❌ Builder Subgraph failed to receive discovery context.');
		process.exit(1);
	}

	console.log('\nTesting ConfiguratorSubgraph.transformInput...');
	const configuratorInput = configuratorSubgraph.transformInput(mockParentState as any);

	console.log('Configurator Supervisor Instructions:', configuratorInput.supervisorInstructions);

	if (
		configuratorInput.supervisorInstructions?.includes(
			'Best Practices for Configuration:\nUse error handling',
		) &&
		configuratorInput.supervisorInstructions?.includes('Configurator context')
	) {
		console.log('✅ Configurator Subgraph correctly received discovery context.');
	} else {
		console.error('❌ Configurator Subgraph failed to receive discovery context.');
		process.exit(1);
	}
}

verify().catch(console.error);
