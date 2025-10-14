/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { INodeProperties, NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { NSFW_SYSTEM_PROMPT } from './checks/nsfw';
import { PROMPT_INJECTION_DETECTION_CHECK_PROMPT } from './checks/promptInjection';
import { JAILBREAK_PROMPT } from './checks/jailbreak';
import { TOPICAL_ALIGNMENT_SYSTEM_PROMPT } from './checks/topicalAlignment';

const THRESHOLD_OPTION: INodeProperties = {
	displayName: 'Threshold',
	name: 'threshold',
	type: 'options',
	default: 1,
	description:
		'The confidence threshold for the guardrail. 0.0 is the lowest threshold and 1.0 is the highest threshold.',
	options: [
		{
			name: 'Low',
			value: 0.25,
		},
		{
			name: 'Medium',
			value: 0.5,
		},
		{
			name: 'High',
			value: 1.0,
		},
	],
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
	displayName: 'GuardRails',
	name: 'guardrails',
	icon: 'file:openAi.svg',
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
	// TODO: make inputs
	inputs: [
		'main',
		{
			type: 'ai_languageModel',
			displayName: 'Chat Model',
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
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName: 'Input Text',
			name: 'inputText',
			type: 'string',
			default: '',
			typeOptions: {
				rows: 6,
			},
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
						'This guardrail checks if specified keywords appear in the input text and can be configured to trigger tripwires based on keyword matches. Multiple keywords can be added separated by comma',
				},
				{
					displayName: 'Jailbreak',
					name: 'jailbreak',
					type: 'fixedCollection',
					default: { value: { threshold: 1 } },
					description: 'Detects attempts to jailbreak or bypass AI safety measures',
					options: [wrapValue([getPromptOption(JAILBREAK_PROMPT), THRESHOLD_OPTION])],
				},
				{
					displayName: 'NSFW',
					name: 'nsfw',
					type: 'fixedCollection',
					default: { value: { threshold: 1 } },
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
								default: 'Redact',
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
						]),
					],
				},
				{
					displayName: 'Prompt Injection',
					name: 'promptInjection',
					type: 'fixedCollection',
					default: { value: { threshold: 1 } },
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
								default: 'redact',
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
					default: { value: { threshold: 1 } },
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
								displayName: 'Allowed URLs',
								name: 'allowedUrls',
								type: 'string',
								default: '',
								description: 'Multiple URLs can be added separated by comma',
							},
							{
								displayName: 'Allowed Schemes',
								name: 'allowedSchemes',
								type: 'string',
								default: 'https',
								description: 'Multiple schemes can be added separated by comma',
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
					default: { values: [{ type: 'text' }] },
					options: [
						{
							displayName: 'Values',
							name: 'values',
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
