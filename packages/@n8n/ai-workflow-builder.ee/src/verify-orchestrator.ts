import { ChatOpenAI } from '@langchain/openai';
import { Orchestrator } from './orchestrator';
import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';
import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { ConfiguratorSubgraph } from './subgraphs/configurator.subgraph';

async function verify() {
	console.log('Verifying Orchestrator...');

	const llm = new ChatOpenAI({ modelName: 'gpt-4' });
	const orchestrator = new Orchestrator({ llm });

	console.log('Registering subgraphs...');
	orchestrator.registerSubgraph(new DiscoverySubgraph());
	orchestrator.registerSubgraph(new BuilderSubgraph());
	orchestrator.registerSubgraph(new ConfiguratorSubgraph());

	console.log('Building workflow...');
	const workflow = orchestrator.build({
		parsedNodeTypes: [],
		llm: llm,
	});

	console.log('Workflow built successfully!');
}

verify().catch(console.error);
