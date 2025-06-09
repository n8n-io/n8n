import type { INodeProperties } from 'n8n-workflow';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { pdfcoApiRequestWithJobCheck, sanitizeProfiles, ActionConstants } from '../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Input Link(s)',
		name: 'url',
		type: 'string',
		required: true,
		default: [],
		placeholder: 'https://example.com/invoice.pdf',
		description: 'The URLs of the PDF files to merge',
		//hint: `Enter URLs as a comma-separated list or in separate fields. Enable Auto-Convert for non-PDF files. `,
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add URL', // Button text to add more fields
		},
		displayOptions: {
			show: {
				operation: [ActionConstants.MergePdf],
			},
		},
	},
	{
		displayName: 'Automatically Convert Non-PDF Files',
		name: 'autoConvert',
		type: 'boolean',
		default: false,
		description: 'Whether to auto-convert DOC, DOCX, XLS, JPG, PNG, MSG, EML files to PDF before merging',
		displayOptions: {
			show: {
				operation: [ActionConstants.MergePdf],
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
				operation: [ActionConstants.MergePdf],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the output file',
				//hint: `Enter the name of the output file. If not specified, the original file name is used.`,
			},
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
	}
];


export async function execute(this: IExecuteFunctions, index: number) {
	// Retrieve the "url" parameter. It might be either a single string (comma-separated) or an array.
	const rawUrls = this.getNodeParameter('url', index);
	let inputUrls: string[];

	// Convert to array if needed.
	if (Array.isArray(rawUrls)) {
		inputUrls = rawUrls as string[];
	} else if (typeof rawUrls === 'string') {
		// If the string contains commas, split on comma; otherwise, treat it as a single value.
		inputUrls = rawUrls.includes(',') ? rawUrls.split(',') : [rawUrls];
	} else {
		inputUrls = [];
	}

	// Trim and filter out any empty strings.
	inputUrls = inputUrls.map((url) => url.trim()).filter((url) => url.length > 0);

	const autoConvert = this.getNodeParameter('autoConvert', index) as boolean;

	// Retrieve advanced options (returns an empty object if not provided)
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	// Retrieve optional values from advanced options using optional chaining
	const fileName = advancedOptions?.name as string | undefined;
	const profiles = advancedOptions?.profiles as string | undefined;
	const callback = advancedOptions?.callback as string | undefined;
	const expiration = advancedOptions?.expiration as number | undefined;
	const httpusername = advancedOptions?.httpusername as string | undefined;
	const httppassword = advancedOptions?.httppassword as string | undefined;

	// Choose endpoint based on autoConvert flag
	const endpoint = autoConvert ? `/v1/pdf/merge2` : `/v1/pdf/merge`;

	// Join the processed URLs into a single comma-separated string.
	const inputUrl = inputUrls.join(',');

	// Build the payload object; add fileName and profiles only if provided
	const body: IDataObject = { url: inputUrl, async: true };
	if (fileName) body.name = fileName;
	if (callback) body.callback = callback;
	if (profiles) body.profiles = profiles;
	if (expiration) body.expiration = expiration;
	if (httpusername) body.httpusername = httpusername;
	if (httppassword) body.httppassword = httppassword;
	// Sanitize the profiles (if present)
	sanitizeProfiles(body);

	// Make the API request and return the response in the expected format
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
