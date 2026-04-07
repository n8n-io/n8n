import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class TestNodeWithTracing implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tracing Test Node',
		name: 'tracingTestNode',
		group: ['transform'],
		version: 1,
		description: 'Test node that emits tracing metadata',
		defaults: { name: 'TracingTestNode' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.setMetadata({
			tracing: {
				'llm.model': 'gpt-4o',
				'llm.token.input': 1500,
				'llm.token.output': 340,
				'llm.stream': true,
			},
		});

		return [this.getInputData()];
	}
}
