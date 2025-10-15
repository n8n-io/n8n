/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeProperties, type INodeTypeDescription } from 'n8n-workflow';

import { JAILBREAK_PROMPT } from './actions/checks/jailbreak';
import { NSFW_SYSTEM_PROMPT } from './actions/checks/nsfw';
import { PII_NAME_MAP, PIIEntity } from './actions/checks/pii';
import { PROMPT_INJECTION_DETECTION_CHECK_PROMPT } from './actions/checks/promptInjection';
import { TOPICAL_ALIGNMENT_SYSTEM_PROMPT } from './actions/checks/topicalAlignment';

const THRESHOLD_OPTION: INodeProperties = {
	displayName: 'Threshold',
	name: 'threshold',
	type: 'number',
	default: 0.5,
	description: 'Minimum confidence threshold to trigger the guardrail (0.0 to 1.0)',
};

const getPromptOption: (defaultPrompt: string) => INodeProperties = (defaultPrompt: string) => ({
	displayName: 'Prompt',
	name: 'prompt',
	type: 'string',
	default: defaultPrompt,
	description:
		'The system prompt used by the guardrail. JSON output is enforced by the node automatically.',
	typeOptions: {
		rows: 6,
	},
});

const wrapValue = (properties: INodeProperties[]) => ({
	displayName: 'Value',
	name: 'value',
	values: properties,
});

export const versionDescription: INodeTypeDescription = {
	displayName: 'Guardrails',
	name: 'guardrails',
	icon: 'file:guardrails.svg',
	group: ['transform'],
	version: 1,
	description: 'Validates your inputs and outputs of AI models',
	defaults: {
		name: 'GuardRails',
	},
	codex: {
		alias: ['LangChain', 'GuardRails', 'assistant'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'TODO: Add documentation',
				},
			],
		},
	},
	inputs: [
		'main',
		{
			type: 'ai_languageModel',
			displayName: 'Chat Model',
			maxConnections: 1,
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'n8n/n8n-nodes-langchain.lmOpenAi',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
	],
	outputs: `={{
			((parameters) => {
				const mode = parameters.violationBehavior ?? 'routeToFailOutput';

				if (mode === 'routeToFailOutput') {
					return [{displayName: "Pass", type: "${NodeConnectionTypes.Main}"}, {displayName: "Fail", type: "${NodeConnectionTypes.Main}"}]
				}

				return [{ displayName: "", type: "${NodeConnectionTypes.Main}"}]
			})($parameter)
		}}`,
	properties: [
		{
			displayName: 'Connect chat models that support tool calling',
			name: 'noticeChatModel',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Input Text',
			name: 'inputText',
			type: 'string',
			default: '',
			typeOptions: {
				rows: 4,
			},
		},
		{
			displayName: 'On Violation',
			name: 'violationBehavior',
			type: 'options',
			default: 'routeToFailOutput',
			options: [
				{ name: 'Route to Fail Output', value: 'routeToFailOutput' },
				{ name: 'Throw Error', value: 'throwError' },
			],
		},
		{
			displayName: 'Guardrails',
			name: 'guardrails',
			placeholder: 'Add Guardrail',
			type: 'collection',
			default: {},
			options: [
				{
					displayName: 'Keywords',
					name: 'keywords',
					type: 'string',
					default: '',
					description:
						'This guardrail checks if specified keywords appear in the input text and can be configured to trigger tripwires based on keyword matches. Multiple keywords can be added separated by comma.',
				},
				{
					displayName: 'Jailbreak',
					name: 'jailbreak',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: 'Detects attempts to jailbreak or bypass AI safety measures',
					options: [wrapValue([getPromptOption(JAILBREAK_PROMPT), THRESHOLD_OPTION])],
				},
				{
					displayName: 'NSFW',
					name: 'nsfw',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: 'Detects attempts to generate NSFW content',
					options: [wrapValue([getPromptOption(NSFW_SYSTEM_PROMPT), THRESHOLD_OPTION])],
				},
				{
					displayName: 'PII',
					name: 'pii',
					type: 'fixedCollection',
					default: { value: { mode: 'redact' } },
					description: 'Detects attempts to generate PII content',
					options: [
						wrapValue([
							{
								displayName: 'Mode',
								name: 'mode',
								type: 'options',
								default: '',
								options: [
									{
										name: 'Redact',
										value: 'redact',
									},
									{
										name: 'Block',
										value: 'block',
									},
								],
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'all',
								options: [
									{ name: 'All', value: 'all' },
									{ name: 'Selected', value: 'selected' },
								],
							},
							{
								displayName: 'Entities',
								name: 'entities',
								type: 'multiOptions',
								default: [],
								displayOptions: {
									show: {
										type: ['selected'],
									},
								},
								options: Object.values(PIIEntity).map((entity) => ({
									name: PII_NAME_MAP[entity],
									value: entity,
								})),
							},
							{
								displayName: 'Custom Regex',
								name: 'customRegex',
								type: 'fixedCollection',
								typeOptions: {
									sortable: true,
									multipleValues: true,
								},
								placeholder: 'Add Custom Regex',
								default: { regex: [] },
								options: [
									{
										displayName: 'Regex',
										name: 'regex',
										values: [
											{
												displayName: 'Name',
												name: 'name',
												type: 'string',
												default: '',
												description: 'Name of the custom regex. Will be used for replacement.',
											},
											{
												displayName: 'Regex',
												name: 'value',
												type: 'string',
												default: '',
												description: 'Regex to match the input text',
												placeholder: '/text/gi',
											},
										],
									},
								],
							},
						]),
					],
				},
				{
					displayName: 'Prompt Injection',
					name: 'promptInjection',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: 'Detects attempts to inject prompt into the input text',
					options: [
						wrapValue([getPromptOption(PROMPT_INJECTION_DETECTION_CHECK_PROMPT), THRESHOLD_OPTION]),
					],
				},
				{
					displayName: 'Secret Keys',
					name: 'secretKeys',
					type: 'fixedCollection',
					default: { value: { mode: 'redact' } },
					description: 'Detects attempts to use secret keys in the input text',
					options: [
						wrapValue([
							{
								displayName: 'Mode',
								name: 'mode',
								type: 'options',
								default: 'block',
								options: [
									{
										name: 'Redact',
										value: 'redact',
									},
									{
										name: 'Block',
										value: 'block',
									},
								],
							},
							{
								displayName: 'Permisiveness',
								name: 'permisiveness',
								type: 'options',
								default: 'strict',
								options: [
									{
										name: 'Strict',
										value: 'strict',
									},
									{ name: 'Balanced', value: 'balanced' },
									{
										name: 'Permissive',
										value: 'permissive',
									},
								],
							},
						]),
					],
				},
				{
					displayName: 'Topical Alignment',
					name: 'topicalAlignment',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: 'Detects attempts to stray from the business scope',
					options: [
						wrapValue([getPromptOption(TOPICAL_ALIGNMENT_SYSTEM_PROMPT), THRESHOLD_OPTION]),
					],
				},
				{
					displayName: 'URLs',
					name: 'urls',
					type: 'fixedCollection',
					default: { value: { allowedSchemes: 'https' } },
					description: 'Blocks URLs that are not in the allowed list',
					options: [
						wrapValue([
							{
								displayName: 'Mode',
								name: 'mode',
								type: 'options',
								default: 'block',
								options: [
									{
										name: 'Redact',
										value: 'redact',
									},
									{
										name: 'Block',
										value: 'block',
									},
								],
							},
							{
								displayName: 'Allowed URLs',
								name: 'allowedUrls',
								type: 'string',
								default: '',
								description: 'Multiple URLs can be added separated by comma',
							},
							{
								displayName: 'Allowed Schemes',
								name: 'allowedSchemes',
								type: 'multiOptions',
								default: ['https'],
								// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
								options: [
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'https', value: 'https' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'http', value: 'http' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'ftp', value: 'ftp' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'data', value: 'data' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'javascript', value: 'javascript' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'vbscript', value: 'vbscript' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'mailto', value: 'mailto' },
								],
							},
							{
								displayName: 'Block Userinfo',
								name: 'blockUserinfo',
								type: 'boolean',
								default: true,
								description:
									'Whether to block URLs with userinfo (user:pass@domain) to prevent credential injection',
							},
							{
								displayName: 'Allow Subdomains',
								name: 'allowSubdomains',
								type: 'boolean',
								default: true,
								description:
									'Whether to allow subdomains (e.g. sub.domain.com if domain.com is allowed)',
							},
						]),
					],
				},
				{
					displayName: 'Custom',
					name: 'custom',
					type: 'fixedCollection',
					typeOptions: {
						sortable: true,
						multipleValues: true,
					},
					placeholder: 'Add Custom Guardrail',
					default: { guardrail: [] },
					options: [
						{
							displayName: 'Guardrail',
							name: 'guardrail',
							values: [
								{
									displayName: 'Name',
									name: 'name',
									type: 'string',
									default: '',
									description: 'Name of the custom guardrail',
								},
								getPromptOption(''),
								THRESHOLD_OPTION,
							],
						},
					],
				},
			],
		},
	],
};
