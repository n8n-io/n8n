import type { INodeProperties } from 'n8n-workflow';

export const textOperations: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		description: 'Input text to translate',
		required: true,
		displayOptions: {
			show: {
				operation: ['translate'],
			},
		},
	},
	{
		displayName: 'Target language name or ID',
		name: 'translateTo',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLanguages',
		},
		default: '',
		description:
			'Language to translate to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
		displayOptions: {
			show: {
				operation: ['translate'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		options: [
			{
				displayName: 'Source language name or ID',
				name: 'sourceLang',
				type: 'options',
				default: '',
				description:
					'Language to translate from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
			},
			{
				displayName: 'Split sentences',
				name: 'splitSentences',
				type: 'options',
				default: '1',
				description: 'How the translation engine should split sentences',
				options: [
					{
						name: 'Interpunction only',
						value: 'nonewlines',
						description: 'Split text on interpunction only, ignoring newlines',
					},
					{
						name: 'No splitting',
						value: '0',
						description: 'Treat all text as a single sentence',
					},
					{
						name: 'On punctuation and newlines',
						value: '1',
						description: 'Split text on interpunction and newlines',
					},
				],
			},
			{
				displayName: 'Preserve formatting',
				name: 'preserveFormatting',
				type: 'options',
				default: '0',
				description:
					'Whether the translation engine should respect the original formatting, even if it would usually correct some aspects',
				options: [
					{
						name: 'Apply corrections',
						value: '0',
						description:
							'Fix punctuation at the beginning and end of sentences and fixes lower/upper caseing at the beginning',
					},
					{
						name: 'Do not correct',
						value: '1',
						description: 'Keep text as similar as possible to the original',
					},
				],
			},
			{
				displayName: 'Formality',
				name: 'formality',
				type: 'options',
				default: 'default',
				description:
					'How formal or informal the target text should be. May not be supported with all languages.',
				options: [
					{
						name: 'Formal',
						value: 'more',
					},
					{
						name: 'Informal',
						value: 'less',
					},
					{
						name: 'Neutral',
						value: 'default',
					},
				],
			},
		],
	},
];
