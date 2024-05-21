import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC,
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the assistant. The maximum length is 256 characters.',
		placeholder: 'e.g. My Assistant',
		required: true,
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'The description of the assistant. The maximum length is 512 characters.',
		placeholder: 'e.g. My personal assistant',
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		description:
			'The system instructions that the assistant uses. The maximum length is 32768 characters.',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Code Interpreter',
		name: 'codeInterpreter',
		type: 'boolean',
		default: false,
		description:
			'Whether to enable the code interpreter that allows the assistants to write and run Python code in a sandboxed execution environment, find more <a href="https://platform.openai.com/docs/assistants/tools/code-interpreter" target="_blank">here</a>',
	},
	{
		displayName: 'Knowledge Retrieval',
		name: 'knowledgeRetrieval',
		type: 'boolean',
		default: false,
		description:
			'Whether to augments the assistant with knowledge from outside its model, such as proprietary product information or documents, find more <a href="https://platform.openai.com/docs/assistants/tools/knowledge-retrieval" target="_blank">here</a>',
	},
	//we want to display Files selector only when codeInterpreter true or knowledgeRetrieval true or both
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Files',
		name: 'file_ids',
		type: 'multiOptions',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
		description:
			'The files to be used by the assistant, there can be a maximum of 20 files attached to the assistant. You can use expression to pass file IDs as an array or comma-separated string.',
		typeOptions: {
			loadOptionsMethod: 'getFiles',
		},
		default: [],
		hint: "Add more files by using the 'Upload a File' operation",
		displayOptions: {
			show: {
				codeInterpreter: [true],
			},
			hide: {
				knowledgeRetrieval: [true],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Files',
		name: 'file_ids',
		type: 'multiOptions',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
		description:
			'The files to be used by the assistant, there can be a maximum of 20 files attached to the assistant',
		typeOptions: {
			loadOptionsMethod: 'getFiles',
		},
		default: [],
		hint: "Add more files by using the 'Upload a File' operation",
		displayOptions: {
			show: {
				knowledgeRetrieval: [true],
			},
			hide: {
				codeInterpreter: [true],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Files',
		name: 'file_ids',
		type: 'multiOptions',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
		description:
			'The files to be used by the assistant, there can be a maximum of 20 files attached to the assistant',
		typeOptions: {
			loadOptionsMethod: 'getFiles',
		},
		default: [],
		hint: "Add more files by using the 'Upload a File' operation",
		displayOptions: {
			show: {
				knowledgeRetrieval: [true],
				codeInterpreter: [true],
			},
		},
	},
	{
		displayName:
			'Add custom n8n tools when you <i>message</i> your assistant (rather than when creating it)',
		name: 'noticeTools',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
			{
				displayName: 'Output Randomness (Top P)',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'An alternative to sampling with temperature, controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
			{
				displayName: 'Fail if Assistant Already Exists',
				name: 'failIfExists',
				type: 'boolean',
				default: false,
				description:
					'Whether to fail an operation if the assistant with the same name already exists',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['create'],
		resource: ['assistant'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const name = this.getNodeParameter('name', i) as string;
	const assistantDescription = this.getNodeParameter('description', i) as string;
	const instructions = this.getNodeParameter('instructions', i) as string;
	const codeInterpreter = this.getNodeParameter('codeInterpreter', i) as boolean;
	const knowledgeRetrieval = this.getNodeParameter('knowledgeRetrieval', i) as boolean;
	let file_ids = this.getNodeParameter('file_ids', i, []) as string[] | string;
	if (typeof file_ids === 'string') {
		file_ids = file_ids.split(',').map((file_id) => file_id.trim());
	}
	const options = this.getNodeParameter('options', i, {});

	if (options.failIfExists) {
		const assistants: string[] = [];

		let has_more = true;
		let after: string | undefined;

		do {
			const response = (await apiRequest.call(this, 'GET', '/assistants', {
				headers: {
					'OpenAI-Beta': 'assistants=v2',
				},
				qs: {
					limit: 100,
					after,
				},
			})) as { data: IDataObject[]; has_more: boolean; last_id: string };

			for (const assistant of response.data || []) {
				assistants.push(assistant.name as string);
			}

			has_more = response.has_more;

			if (has_more) {
				after = response.last_id;
			} else {
				break;
			}
		} while (has_more);

		if (assistants.includes(name)) {
			throw new NodeOperationError(
				this.getNode(),
				`An assistant with the same name '${name}' already exists`,
				{ itemIndex: i },
			);
		}
	}

	if (file_ids.length > 20) {
		throw new NodeOperationError(
			this.getNode(),
			'The maximum number of files that can be attached to the assistant is 20',
			{ itemIndex: i },
		);
	}

	const body: IDataObject = {
		model,
		name,
		description: assistantDescription,
		instructions,
	};

	const tools = [];

	if (codeInterpreter) {
		tools.push({
			type: 'code_interpreter',
		});
		body.tool_resources = {
			...((body.tool_resources as object) ?? {}),
			code_interpreter: {
				file_ids,
			},
		};
	}

	if (knowledgeRetrieval) {
		tools.push({
			type: 'file_search',
		});
		body.tool_resources = {
			...((body.tool_resources as object) ?? {}),
			file_search: {
				vector_stores: [
					{
						file_ids,
					},
				],
			},
		};
	}

	if (tools.length) {
		body.tools = tools;
	}

	const response = await apiRequest.call(this, 'POST', '/assistants', {
		body,
		headers: {
			'OpenAI-Beta': 'assistants=v2',
		},
	});

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
