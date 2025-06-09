import type { INodeProperties } from 'n8n-workflow';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import {
	pdfcoApiRequestWithJobCheck,
	sanitizeProfiles,
	ActionConstants,
} from '../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Url',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/document.pdf',
		description: 'The URL of the PDF file to rotate',
		displayOptions: {
			show: {
				operation: [ActionConstants.RotatePdf],
			},
		},
	},
	{
		displayName: 'Rotation Mode',
		name: 'mode',
		type: 'options',
		options: [
			{
				name: 'Auto',
				value: 'auto',
				description: 'Automatically detect and fix rotation based on text analysis',
			},
			{
				name: 'Manual',
				value: 'manual',
				description: 'Manually specify rotation angle',
			},
		],
		default: 'manual',
		displayOptions: {
			show: {
				operation: [ActionConstants.RotatePdf],
			},
		},
	},
	{
		displayName: 'Rotation Angle',
		name: 'angle',
		type: 'options',
		options: [
			{
				name: '90°',
				value: '90',
			},
			{
				name: '180°',
				value: '180',
			},
			{
				name: '270°',
				value: '270',
			},
		],
		default: '90',
		displayOptions: {
			show: {
				operation: [ActionConstants.RotatePdf],
				mode: ['manual'],
			},
		},
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		description: 'Comma-separated list of page numbers to rotate. Leave empty to rotate all pages.',
		displayOptions: {
			show: {
				operation: [ActionConstants.RotatePdf],
				mode: ['manual'],
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
				operation: [ActionConstants.RotatePdf],
			},
		},
		options: [
			{
				displayName: 'OCR Language Name or ID',
				name: 'lang',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				placeholder: 'English',
				description: 'Specify the OCR language for text recognition in scanned PDFs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
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
	const mode = this.getNodeParameter('mode', index) as string;
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	const body: IDataObject = {
		url: inputUrl,
		async: true,
		inline: true,
	};

	if (mode === 'manual') {
		const angle = this.getNodeParameter('angle', index) as string;
		body.angle = parseInt(angle);

		const pages = this.getNodeParameter('pages', index) as string;
		if (pages) {
			body.pages = pages;
		}
	}

	const lang = advancedOptions?.lang as string | undefined;
	if (lang) body.lang = lang;

	const fileName = advancedOptions?.name as string | undefined;
	if (fileName) body.name = fileName;

	const callback = advancedOptions?.callback as string | undefined;
	if (callback) body.callback = callback;

	const expiration = advancedOptions?.expiration as number | undefined;
	if (expiration) body.expiration = expiration;

	const httpusername = advancedOptions?.httpusername as string | undefined;
	if (httpusername) body.httpusername = httpusername;

	const httppassword = advancedOptions?.httppassword as string | undefined;
	if (httppassword) body.httppassword = httppassword;

	const profiles = advancedOptions?.profiles as string | undefined;
	if (profiles) body.profiles = profiles;

	sanitizeProfiles(body);

	const endpoint = mode === 'auto' ? '/v1/pdf/edit/rotate/auto' : '/v1/pdf/edit/rotate';
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
