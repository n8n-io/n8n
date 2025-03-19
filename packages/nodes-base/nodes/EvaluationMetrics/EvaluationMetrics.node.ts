import type {
	AssignmentCollectionValue,
	FieldType,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { composeReturnItem, validateEntry } from '../Set/v2/helpers/utils';

export class EvaluationMetrics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Evaluation Metrics',
		name: 'evaluationMetrics',
		icon: 'fa:check-double',
		group: ['input'],
		iconColor: 'light-green',
		version: 1,
		description: 'Define the metrics returned for workflow evaluation',
		defaults: {
			name: 'Evaluation Metrics',
			color: '#29A568',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName:
					"Define the evaluation metrics returned in your report. Only numeric values are supported. <a href='https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.evaluationmetric/' target='_blank'>More Info</a>",
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Metrics to Return',
				name: 'metrics',
				type: 'assignmentCollection',
				default: {
					assignments: [
						{
							name: '',
							value: '',
							type: 'number',
						},
					],
				},
				typeOptions: {
					assignment: {
						disableType: true,
						defaultType: 'number',
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const metrics: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const dataToSave = this.getNodeParameter('metrics', i, {}) as AssignmentCollectionValue;

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: { item: i },
			};
			const newData = Object.fromEntries(
				(dataToSave?.assignments ?? []).map((assignment) => {
					const { name, value } = validateEntry(
						assignment.name,
						assignment.type as FieldType,
						assignment.value,
						this.getNode(),
						i,
						false,
						1,
					);

					return [name, value];
				}),
			);

			const returnItem = composeReturnItem.call(
				this,
				i,
				newItem,
				newData,
				{ dotNotation: false, include: 'none' },
				1,
			);
			metrics.push(returnItem);
		}

		return [metrics];
	}
}
