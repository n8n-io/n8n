import {
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { execute } from '../actions/execute';
import { propertiesDescription } from '../description';
import { configureNodeInputsV2 } from '../helpers/configureNodeInputs';

export class GuardrailsV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2],
			inputs: `={{(${configureNodeInputsV2})($parameter)}}`,
			outputs: `={{
		((parameters) => {
			const operation = parameters.operation ?? 'classify';

			if (operation === 'classify') {
				return [{displayName: "Pass", type: "${NodeConnectionTypes.Main}"}, {displayName: "Fail", type: "${NodeConnectionTypes.Main}"}]
			}

			return [{ displayName: "", type: "${NodeConnectionTypes.Main}"}]
		})($parameter)
	}}`,
			defaults: {
				name: 'Guardrails',
			},
			properties: propertiesDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await execute.call(this);
	}
}
