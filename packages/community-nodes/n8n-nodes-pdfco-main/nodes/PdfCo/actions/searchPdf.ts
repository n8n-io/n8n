import type { INodeProperties } from 'n8n-workflow';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import {
	pdfcoApiRequestWithJobCheck,
	sanitizeProfiles,
	ActionConstants,
} from '../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'PDF URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/document.pdf',
		description: 'The URL of the PDF file to search',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchPdf],
			},
		},
	},
	{
		displayName: 'Search Query',
		name: 'searchString',
		type: 'string',
		required: true,
		default: '',
		description: 'Specify the text you wish to search for within the PDF document',
		placeholder: 'e.g.: company name',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchPdf],
			},
		},
	},
	{
		displayName: 'Use Regular Expressions',
		name: 'regexSearch',
		type: 'boolean',
		default: false,
		description: 'Whether to use regular expressions for more complex search patterns',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchPdf],
			},
		},
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		description: 'Comma-separated list of page numbers to search in. Leave empty to search all pages.',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchPdf],
			},
		},
	},
	{
		displayName: 'Advanced Options',
		name: 'advancedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchPdf],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the output file',
			},
			{
				displayName: 'Webhook URL',
				name: 'callback',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/callback',
				description: 'The callback URL or Webhook used to receive the output data',
			},
			{
				displayName: 'Output Links Expiration (In Minutes)',
				name: 'expiration',
				type: 'number',
				default: 60,
				description: 'The expiration time of the output link',
			},
			{
				displayName: 'Inline',
				name: 'inline',
				type: 'boolean',
				default: true,
				description: 'Whether to return the output in the response',
			},
			{
				displayName: 'Word Matching Mode',
				name: 'wordMatchingMode',
				type: 'string',
				default: 'SmartMatch',
				options: [
					{
						name: 'Smart Match',
						value: 'SmartMatch',
					},
					{
						name: 'Exact Match',
						value: 'ExactMatch',
					},
					{
						name: 'None',
						value: 'None',
					},
				],
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The password of the PDF file',
			},
			{
				displayName: 'HTTP Username',
				name: 'httpusername',
				type: 'string',
				default: '',
				description: 'The HTTP username if required to access source URL',
			},
			{
				displayName: 'HTTP Password',
				name: 'httppassword',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The HTTP password if required to access source URL',
			},
			{
				displayName: 'Custom Profiles',
				name: 'profiles',
				type: 'string',
				default: '',
				placeholder: `{ 'outputDataFormat': 'base64' }`,
				description: 'Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, index: number) {
	const inputUrl = this.getNodeParameter('url', index) as string;
	const searchString = this.getNodeParameter('searchString', index) as string;
	const regexSearch = this.getNodeParameter('regexSearch', index) as boolean;
	const pages = this.getNodeParameter('pages', index) as string;
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	const body: IDataObject = {
		url: inputUrl,
		searchString,
		regexSearch,
		async: true,
		inline: true,
	};

	if (pages) {
		body.pages = pages;
	}

	const fileName = advancedOptions?.name as string | undefined;
	if (fileName) body.name = fileName;

	const callback = advancedOptions?.callback as string | undefined;
	if (callback) body.callback = callback;

	const expiration = advancedOptions?.expiration as number | undefined;
	if (expiration) body.expiration = expiration;

	const wordMatchingMode = advancedOptions?.wordMatchingMode as string | undefined;
	if (wordMatchingMode) body.wordMatchingMode = wordMatchingMode;

	const httpusername = advancedOptions?.httpusername as string | undefined;
	if (httpusername) body.httpusername = httpusername;

	const httppassword = advancedOptions?.httppassword as string | undefined;
	if (httppassword) body.httppassword = httppassword;

	const password = advancedOptions?.password as string | undefined;
	if (password) body.password = password;

	const inline = advancedOptions?.inline as boolean | undefined;
	if (inline !== undefined) body.inline = inline;

	const profiles = advancedOptions?.profiles as string | undefined;
	if (profiles) body.profiles = profiles;

	sanitizeProfiles(body);

	const responseData = await pdfcoApiRequestWithJobCheck.call(this, '/v1/pdf/find', body);
	return this.helpers.returnJsonArray(responseData);
}
