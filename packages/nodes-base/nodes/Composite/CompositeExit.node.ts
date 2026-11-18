import type {
	CompositeExitLayout,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';

/**
 * The last inner step of an expanded composite node. It has the composite's
 * name, so the nodes after the composite read its output as the composite's.
 * Each exit of the composite owns some of its inputs: the items on those inputs
 * go to one output, or fail the node.
 */
export class CompositeExit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Composite Exit',
		name: 'compositeExit',
		icon: 'fa:sign-out-alt',
		group: ['transform'],
		version: 1,
		hidden: true,
		engines: ['v2'],
		description: 'Joins the branches of a composite node into its outputs',
		defaults: {
			name: 'Composite Exit',
		},
		inputs: '={{ Array.from({ length: $parameter.inputCount }, () => "main") }}',
		outputs: '={{ Array.from({ length: $parameter.outputCount }, () => "main") }}',
		properties: [
			{ displayName: 'Input Count', name: 'inputCount', type: 'number', default: 1 },
			{ displayName: 'Output Count', name: 'outputCount', type: 'number', default: 1 },
			{ displayName: 'Layout', name: 'layout', type: 'string', default: '[]' },
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const outputCount = this.getNodeParameter('outputCount', 0) as number;
		const layout = jsonParse<CompositeExitLayout[]>(this.getNodeParameter('layout', 0) as string);
		const outputs: INodeExecutionData[][] = Array.from({ length: outputCount }, () => []);

		for (const exit of layout) {
			for (const [position, input] of exit.inputs.entries()) {
				const items = this.getInputData(input);
				if (items.length === 0) continue;

				if ('output' in exit) {
					outputs[exit.output].push(...items);
					continue;
				}

				const message = exit.error.replace('{index}', String(position + 1));
				if (!this.continueOnFail()) throw new NodeOperationError(this.getNode(), message);
				outputs[0].push(...items.map((item) => ({ ...item, json: { error: message } })));
			}
		}

		return outputs;
	}
}
