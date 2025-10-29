/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeProperties, type INodeTypeDescription } from 'n8n-workflow';

import { JAILBREAK_PROMPT } from './actions/checks/jailbreak';
import { NSFW_SYSTEM_PROMPT } from './actions/checks/nsfw';
import { PII_NAME_MAP, PIIEntity } from './actions/checks/pii';
import { TOPICAL_ALIGNMENT_SYSTEM_PROMPT } from './actions/checks/topicalAlignment';
import { configureNodeInputs } from './helpers/configureNodeInputs';
import { LLM_SYSTEM_RULES } from './helpers/model';

const THRESHOLD_OPTION: INodeProperties = {
	displayName: 'Threshold',
	name: 'threshold',
	type: 'number',
	default: '',
	description: 'Minimum confidence threshold to trigger the guardrail (0.0 to 1.0)',
	hint: 'Inputs scoring less than this will be treated as violations',
};

const getPromptOption: (
	defaultPrompt: string,
	collapsible?: boolean,
	hint?: string,
) => INodeProperties[] = (defaultPrompt, collapsible = true, hint) => {
	const promptParameters: INodeProperties = {
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		default: defaultPrompt,
		description:
			'The system prompt used by the guardrail. Thresholds and JSON output are enforced by the node automatically.',
		hint,
		typeOptions: {
			rows: 6,
		},
	};
	if (collapsible) {
		return [
			{ displayName: 'Customize Prompt', name: 'customizePrompt', type: 'boolean', default: false },
			{ ...promptParameters, displayOptions: { show: { customizePrompt: [true] } } },
		];
	}
	return [promptParameters];
};

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
	description:
		'Safeguard AI models from malicious input or prevent them from generating undesirable responses',
	defaults: {
		name: 'Guardrails',
	},
	codex: {
		alias: ['LangChain', 'Guardrails', 'PII', 'Secret', 'Injection', 'Sanitize'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.guardrails/',
				},
			],
		},
	},
	inputs: `={{(${configureNodeInputs})($parameter.operation)}}`,
	outputs: `={{
		((parameters) => {
			const operation = parameters.operation ?? 'classify';

			if (operation === 'classify') {
				return [{displayName: "Pass", type: "${NodeConnectionTypes.Main}"}, {displayName: "Fail", type: "${NodeConnectionTypes.Main}"}]
			}

			return [{ displayName: "", type: "${NodeConnectionTypes.Main}"}]
		})($parameter)
	}}`,
	properties: [
		{
			displayName:
				'Use guardrails to validate text against a set of policies (e.g. NSFW, prompt injection) or to sanitize it (e.g. personal data, secret keys)',
			name: 'guardrailsUsage',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Check Text for Violations',
					value: 'classify',
					action: 'Check text for violations',
					description: 'Validate text against a set of policies (e.g. NSFW, prompt injection)',
				},
				{
					name: 'Sanitize Text',
					value: 'sanitize',
					action: 'Sanitize text',
					// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period
					description: 'Redact text to mask personal data, secret keys, URLs, etc.',
				},
			],
			default: 'classify',
		},
		{
			displayName: 'Text To Check',
			name: 'text',
			type: 'string',
			required: true,
			default: '',
			typeOptions: {
				rows: 1,
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
						'This guardrail checks if specified keywords appear in the input text and can be configured to trigger tripwires based on keyword matches. Multiple keywords can be added separated by comma.',
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: 'Jailbreak',
					name: 'jailbreak',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: 'Detects attempts to jailbreak or bypass AI safety measures',
					options: [wrapValue([THRESHOLD_OPTION, ...getPromptOption(JAILBREAK_PROMPT)])],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: 'NSFW',
					name: 'nsfw',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: 'Detects attempts to generate NSFW content',
					options: [wrapValue([THRESHOLD_OPTION, ...getPromptOption(NSFW_SYSTEM_PROMPT)])],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: 'Personal Data (PII)',
					name: 'pii',
					type: 'fixedCollection',
					default: { value: { type: 'all' } },
					description: 'Detects attempts to use personal data content',
					options: [
						wrapValue([
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: '',
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
						]),
					],
				},
				{
					displayName: 'Secret Keys',
					name: 'secretKeys',
					type: 'fixedCollection',
					default: { value: { permissiveness: 'balanced' } },
					description:
						'Detects attempts to use secret keys in the input text. Scans text for common patterns, applies entropy analysis to detect random-looking strings.',
					options: [
						wrapValue([
							{
								displayName: 'Permissiveness',
								name: 'permissiveness',
								type: 'options',
								default: '',
								options: [
									{
										name: 'Strict',
										value: 'strict',
										description:
											'Most sensitive, may have more false positives (commonly flag high entropy filenames or code)',
									},
									{
										name: 'Balanced',
										value: 'balanced',
										description: 'Balanced between sensitivity and specificity',
									},
									{
										name: 'Permissive',
										value: 'permissive',
										description:
											'Least sensitive, may miss some secret keys (but also reduces false positives)',
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
						wrapValue([
							THRESHOLD_OPTION,
							...getPromptOption(
								TOPICAL_ALIGNMENT_SYSTEM_PROMPT,
								false,
								'Make sure you replace the placeholder.',
							),
						]),
					],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: 'URLs',
					name: 'urls',
					type: 'fixedCollection',
					default: { value: { allowedSchemes: ['https'], allowedUrls: '' } },
					description: 'Blocks URLs that are not in the allowed list',
					options: [
						wrapValue([
							{
								displayName: 'Block All URLs Except',
								name: 'allowedUrls',
								type: 'string',
								// keep placeholder to avoid limitation that removes collections with unchanged default values
								default: 'PLACEHOLDER',
								description:
									'Multiple URLs can be added separated by comma. Leave empty to block all URLs.',
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
								displayOptions: {
									show: {
										'/operation': ['classify'],
									},
								},
							},
							{
								displayName: 'Sanitize Userinfo',
								name: 'blockUserinfo',
								type: 'boolean',
								default: true,
								description:
									'Whether to sanitize URLs with userinfo (user:pass@domain) to prevent credential injection',
								displayOptions: {
									show: {
										'/operation': ['sanitize'],
									},
								},
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
					default: {
						guardrail: [{ name: 'Custom Guardrail' }],
					},
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
								THRESHOLD_OPTION,
								...getPromptOption('', false),
							],
						},
					],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
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
					default: {},
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
									description:
										'Name of the custom regex. Will be used for replacement when sanitizing.',
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
			],
		},
		{
			displayName: 'Customize System Message',
			name: 'customizeSystemMessage',
			description:
				'Whether to customize the system message used by the guardrail to specify the output format',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					'/operation': ['classify'],
				},
			},
		},
		{
			displayName: 'System Message',
			name: 'systemMessage',
			type: 'string',
			description:
				'The system message used by the guardrail to enforce thresholds and JSON output according to schema',
			hint: 'This message is appended after prompts defined by guardrails',
			default: LLM_SYSTEM_RULES,
			typeOptions: {
				rows: 6,
			},
			displayOptions: {
				show: {
					'/customizeSystemMessage': [true],
				},
			},
		},
	],
};
