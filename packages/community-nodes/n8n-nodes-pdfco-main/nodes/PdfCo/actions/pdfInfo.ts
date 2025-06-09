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
		placeholder: 'https://example.com/invoice.pdf',
		description: 'The URL of the PDF file to get information about',
		displayOptions: {
			show: {
				operation: [ActionConstants.PDFInfo],
			},
		},
	},
	{
		displayName: 'Extract Fillable Fields',
		name: 'fields',
		type: 'boolean',
		default: false,
		description: 'Whether to extract fillable fields from the PDF',
		displayOptions: {
			show: {
				operation: [ActionConstants.PDFInfo],
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
				operation: [ActionConstants.PDFInfo],
			},
		},
		options: [
			{
				displayName: 'Webhook URL',
				name: 'callback',
				type: 'string', // You can also use "url" if you want built-in URL validation.
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
	// Retrieve the "url" parameter.
	const inputUrl = this.getNodeParameter('url', index) as string;

	const fields = this.getNodeParameter('fields', index) as boolean;

	// Choose endpoint based on autoConvert flag
	const endpoint = fields ? `/v1/pdf/info/fields` : `/v1/pdf/info`;

	// Build the payload object; add fileName and profiles only if provided
	const body: IDataObject = { url: inputUrl, async: true, inline: true };

	// Advanced Options
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	const callback = advancedOptions?.callback as string | undefined;
	if (callback) body.callback = callback;

	const expiration = advancedOptions?.expiration as number | undefined;
	if (expiration) body.expiration = expiration;

	const profiles = advancedOptions?.profiles as string | undefined;
	if (profiles) body.profiles = profiles;

	const password = advancedOptions?.password as string | undefined;
	if (password) body.password = password;

	const httpusername = advancedOptions?.httpusername as string | undefined;
	if (httpusername) body.httpusername = httpusername;

	const httppassword = advancedOptions?.httppassword as string | undefined;
	if (httppassword) body.httppassword = httppassword;

	// Sanitize the profiles (if present)
	sanitizeProfiles(body);

	// Make the API request and return the response in the expected format
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
