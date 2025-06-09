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
		description: 'The URL of the PDF file to make searchable or unsearchable',
		displayOptions: {
			show: {
				operation: [ActionConstants.MakePdfSearchable],
			},
		},
	},
	{
		displayName: 'Make PDF Searchable or Unsearchable',
		name: 'searchableOptions',
		type: 'options',
		default: 'makeSearchable',
		options: [
			{
				name: 'Make PDF Searchable',
				value: 'makeSearchable',
			},
			{
				name: 'Make PDF Unsearchable',
				value: 'makeUnsearchable',
			},
		],
		displayOptions: {
			show: {
				operation: [ActionConstants.MakePdfSearchable],
			},
		},
	},
	{
		displayName: 'OCR Language Name or ID',
		name: 'lang',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLanguages',
		},
		default: '',
		placeholder: 'English',
		description: 'Specify the language for OCR when extracting text from scanned documents. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				operation: [ActionConstants.MakePdfSearchable],
				searchableOptions: ['makeSearchable'],
			},
		}
	},
	{
		displayName: 'Advanced Options',
		name: 'advancedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.MakePdfSearchable],
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
				displayName: 'Pages',
				name: 'pages',
				type: 'string',
				description: 'Page numbers (e.g., 0,1-2,5,7-)',
				default: '',
				placeholder: '0',
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
	const url = this.getNodeParameter('url', index) as string;
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;
	const searchableOptions = this.getNodeParameter('searchableOptions', index) as string;

	const body: IDataObject = {
		url,
		async: true,
	};

	let apiUrl = '/v1/pdf/makesearchable';
	if (searchableOptions === 'makeSearchable') {
		const lang = this.getNodeParameter('lang', index) as string;
		body.lang = lang;
	} else {
		apiUrl = '/v1/pdf/makeunsearchable';
	}

	// Add advanced options
	const fileName = advancedOptions?.name as string | undefined;
	if (fileName) body.name = fileName;

	const pages = advancedOptions?.pages as string | undefined;
	if (pages) body.pages = pages;

	const callback = advancedOptions?.callback as string | undefined;
	if (callback) body.callback = callback;

	const expiration = advancedOptions?.expiration as number | undefined;
	if (expiration) body.expiration = expiration;

	const httpusername = advancedOptions?.httpusername as string | undefined;
	if (httpusername) body.httpusername = httpusername;

	const httppassword = advancedOptions?.httppassword as string | undefined;
	if (httppassword) body.httppassword = httppassword;

	const password = advancedOptions?.password as string | undefined;
	if (password) body.password = password;

	const profiles = advancedOptions?.profiles as string | undefined;
	if (profiles) body.profiles = profiles;

	sanitizeProfiles(body);

	const responseData = await pdfcoApiRequestWithJobCheck.call(this, apiUrl, body);
	return this.helpers.returnJsonArray(responseData);
}
