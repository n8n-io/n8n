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
			// Builder hint for workflow-sdk type generation
			// ai_languageModel is required only when LLM-based guardrails are used
			builderHint: {
				inputs: {
					ai_languageModel: {
						required: true,
						displayOptions: {
							show: {
								// Model is required when ANY of these LLM guardrails exist
								'/guardrails.(jailbreak|nsfw|topicalAlignment|custom)': [
									{ _cnd: { exists: true } },
								],
							},
						},
					},
				},
				message:
					'Classify operation has two outputs: output 0 (Pass) for items that passed all guardrail checks, output 1 (Fail) for items that failed. Use .output(index).to() to connect from a specific output. @example guardrails.output(0).to(passNode) and guardrails.output(1).to(failNode). Sanitize operation has only one output.',
			},
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await execute.call(this);
	}
}
