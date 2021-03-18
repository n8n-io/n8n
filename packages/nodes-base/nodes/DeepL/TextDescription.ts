import {
	INodeProperties,
} from 'n8n-workflow';

export const textOperations = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		description: 'The input text to translate',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: [
					'translate',
				],
			},
		},
	},
	{
		displayName: 'Translate To',
		name: 'translateTo',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLanguages',
		},
		default: '',
		description: 'The language to use for translation of the input text.',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'translate',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Source Language',
				name: 'sourceLang',
				type: 'options',
				default: '',
				description: 'Source text language.',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
			},
			{
				displayName: 'Split Sentences',
				name: 'splitSentences',
				type: 'options',
				default: '1',
				description: 'Sets if the translation engine should split into sentences.',
				options: [
					{
						name: 'No splitting',
						value: '0',
						description: 'Treat all text as a single sentence',
					},
					{
						name: 'Default - on punctuation and newlines',
						value: '1',
						description: 'Splits text on interpunction and on newlines',
					},
					{
						name: 'interpunction only',
						value: 'nonewlines',
						description: 'Splits on interpunction only, ignoring newlines',
					},
				],
			},
			{
				displayName: 'Preserve Formatting',
				name: 'preserveFormatting',
				type: 'options',
				default: '0',
				description: 'Sets whether the translation engine should respect the original formatting, even if it would usually correct some aspects.',
				options: [
					{
						name: 'Default - apply corrections',
						value: '0',
						description: 'Fixes punctuation at the beginning and end of sentences and fixes lower/upper cases at the beginning.',
					},
					{
						name: 'Do not correct',
						value: '1',
						description: 'Keeps text as similar as possible to original',
					},
				],
			},
			{
				displayName: 'Formality',
				name: 'formality',
				type: 'options',
				default: 'default',
				description: 'Sets how the translated text should lean towards formal or informal language. May not be supported with all languages.',
				options: [
					{
						name: 'Default - lean toward neutral language',
						value: 'default',
						description: 'Default machine behavior',
					},
					{
						name: 'Formal',
						value: 'more',
						description: 'Lean toward formal language',
					},
					{
						name: 'Informal',
						value: 'less',
						description: 'Lean toward informal language',
					},
				],
			},
		],
	},
] as INodeProperties[];
