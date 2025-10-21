import type { INodeProperties } from 'n8n-workflow';

export const textOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
		options: [
			{
				name: 'Translate',
				value: 'translate',
				description: 'Translate text from one language to another',
				action: 'Translate text',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSShineFrontendService_20170701.TranslateText',
						},
					},
				},
			},
			{
				name: 'Translate Document',
				value: 'translateDocument',
				description: 'Translate a document',
				action: 'Translate a document',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSShineFrontendService_20170701.TranslateDocument',
						},
					},
				},
			},
		],
		default: 'translate',
	},
];

export const textFields: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'Text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['translate'],
			},
		},
		default: '',
		typeOptions: {
			rows: 4,
		},
		routing: {
			request: {
				body: {
					Text: '={{ $value }}',
				},
			},
		},
		description: 'The text to translate',
	},
	{
		displayName: 'Source Language Code',
		name: 'SourceLanguageCode',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['translate', 'translateDocument'],
			},
		},
		default: 'auto',
		routing: {
			request: {
				body: {
					SourceLanguageCode: '={{ $value }}',
				},
			},
		},
		description: 'The language code of the source text (use "auto" for automatic detection)',
	},
	{
		displayName: 'Target Language Code',
		name: 'TargetLanguageCode',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['translate', 'translateDocument'],
			},
		},
		default: 'en',
		routing: {
			request: {
				body: {
					TargetLanguageCode: '={{ $value }}',
				},
			},
		},
		description: 'The language code for the translated text (e.g., "en" for English, "es" for Spanish)',
	},
	{
		displayName: 'Terminology Names',
		name: 'TerminologyNames',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['translate'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					TerminologyNames: '={{ $value ? $value.split(",").map(s => s.trim()) : undefined }}',
				},
			},
		},
		description: 'Custom terminology names (comma-separated)',
	},
	{
		displayName: 'Settings',
		name: 'Settings',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['translate'],
			},
		},
		default: '{"Formality": "FORMAL", "Profanity": "MASK"}',
		routing: {
			request: {
				body: {
					Settings: '={{ $value ? JSON.parse($value) : undefined }}',
				},
			},
		},
		description: 'Translation settings (Formality: FORMAL/INFORMAL, Profanity: MASK)',
	},
	{
		displayName: 'Document Content',
		name: 'DocumentContent',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['translateDocument'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					Document: {
						Content: '={{ $value }}',
						ContentType: 'text/html',
					},
				},
			},
		},
		description: 'The document content to translate (base64 encoded for binary documents)',
	},
	{
		displayName: 'Document Content Type',
		name: 'ContentType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['translateDocument'],
			},
		},
		options: [
			{
				name: 'Plain Text',
				value: 'text/plain',
			},
			{
				name: 'HTML',
				value: 'text/html',
			},
			{
				name: 'Word Document (DOCX)',
				value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			},
			{
				name: 'PowerPoint (PPTX)',
				value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			},
			{
				name: 'Excel (XLSX)',
				value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			},
		],
		default: 'text/html',
		description: 'The content type of the document',
	},
];
