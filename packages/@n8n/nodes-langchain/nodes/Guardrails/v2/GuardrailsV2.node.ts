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
				searchHint:
					'Classify operation has two outputs: output 0 (Pass) for items that passed all guardrail checks, output 1 (Fail) for items that failed. Use .output(index).to() to connect from a specific output. @example guardrails.output(0).to(passNode) and guardrails.output(1).to(failNode). Sanitize operation has only one output.',
				extraTypeDefContent: [
					{
						displayOptions: {
							show: {
								operation: ['classify'],
							},
						},
						content: `<patterns>
<pattern title="Guardrails classify with separate Pass and Fail outputs">
const model = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Chat Model',
    parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
    credentials: { openAiApi: { id: 'credId', name: 'OpenAI account' } }
  }
});

const guardrailsCheck = node({
  type: '@n8n/n8n-nodes-langchain.guardrails',
  version: 2,
  config: {
    name: 'Guardrails',
    parameters: {
      operation: 'classify',
      text: expr('{{ $json.input }}'),
      guardrails: { jailbreak: { value: { threshold: 0.7 } } }
    },
    subnodes: { model }
  }
});

const passHandler = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Handle Pass', parameters: {} }
});

const failHandler = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Handle Fail', parameters: {} }
});

// output 0 = Pass, output 1 = Fail
guardrailsCheck.output(0).to(passHandler);
guardrailsCheck.output(1).to(failHandler);
</pattern>
</patterns>`,
					},
				],
			},
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await execute.call(this);
	}
}
