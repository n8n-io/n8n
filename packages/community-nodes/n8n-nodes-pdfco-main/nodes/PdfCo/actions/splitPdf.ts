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
		description: 'The URL of the PDF file to split',
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
			},
		},
	},
	{
		displayName: 'Split By',
		name: 'splitBy',
		type: 'options',
		options: [
			{
				name: 'Page Numbers',
				description: 'Split PDF Based on comma-separated indices of pages (or ranges)',
				value: 'pageNumber',
			},
			{
				name: 'Search Text',
				description: 'Split PDF Based on Text Search',
				value: 'searchText',
			},
			{
				name: 'Barcode',
				description: 'Split PDF Based on Barcode Search',
				value: 'barcode',
			},
		],
		default: 'pageNumber',
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
			},
		},
	},
	{
		displayName: 'Page Numbers/Ranges',
		name: 'pages',
		type: 'string',
		required: true,
		default: '',
		description: 'The page numbers or ranges to split the PDF by',
		placeholder: '1,2-5,7-',
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
				splitBy: ['pageNumber'],
			},
		},
	},
	{
		displayName: 'Text Search String',
		name: 'searchString',
		type: 'string',
		required: true,
		default: '',
		description: 'The text to search for in the PDF',
		placeholder: 'Hello World',
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
				splitBy: ['searchText'],
			},
		},
	},
	{
		displayName: 'Barcode Search String',
		name: 'barcodeSearchString',
		type: 'string',
		required: true,
		default: '',
		description: 'The barcode to search for in the PDF',
		placeholder: '[[barcode:qrcode HelloWorld]]',
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
				splitBy: ['barcode'],
			},
		},
	},
	{
		displayName: 'Advanced Options',
		name: 'advancedOptionsTextSearch',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
				splitBy: ['searchText'],
			},
		},
		options: [
			{
				displayName: 'Enable Case-Sensitive Search',
				name: 'caseSensitive',
				type: 'boolean',
				default: false,
				description: 'Whether to enable case-sensitive search',
			},
			{
				displayName: 'Enable Regular Expression Search',
				name: 'regexSearch',
				type: 'boolean',
				default: false,
				description: 'Whether to enable regular expression search',
			},
			{
				displayName: 'Exclude Pages with Identified Text',
				name: 'excludeKeyPages',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude pages with identified text',
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
				description: 'The language to use for OCR. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Inline',
				name: 'inline',
				type: 'boolean',
				default: true,
				description: 'Whether to return the output in the response',
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
	{
		displayName: 'Advanced Options',
		name: 'advancedOptionsBarcode',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
				splitBy: ['barcode'],
			},
		},
		options: [
			{
				displayName: 'Enable Case-Sensitive Search',
				name: 'caseSensitive',
				type: 'boolean',
				default: false,
				description: 'Whether to enable case-sensitive search',
			},
			{
				displayName: 'Enable Regular Expression Search',
				name: 'regexSearch',
				type: 'boolean',
				default: false,
				description: 'Whether to enable regular expression search',
			},
			{
				displayName: 'Exclude Pages with Identified Barcode',
				name: 'excludeKeyPages',
				type: 'boolean',
				description: 'Whether to exclude pages with identified barcode',
				default: false,
			},
			{
				displayName: 'File Name',
				name: 'name',
				type: 'string',
				description: 'The name of the output file',
				default: '',
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
				description: 'The expiration time of the output link',
				type: 'number',
				default: 60,
			},
			{
				displayName: 'Inline',
				name: 'inline',
				type: 'boolean',
				default: true,
				description: 'Whether to return the output in the response',
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
	{
		displayName: 'Advanced Options',
		name: 'advancedOptionsPageNumber',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.SplitPdf],
				splitBy: ['pageNumber'],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'name',
				type: 'string',
				description: 'The name of the output file',
				default: '',
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
				description: 'The expiration time of the output link',
				default: 60,
			},
			{
				displayName: 'Inline',
				name: 'inline',
				type: 'boolean',
				default: true,
				description: 'Whether to return the output in the response',
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
	// Retrieve the "url" parameter.
	const inputUrl = this.getNodeParameter('url', index) as string;

	// Build the payload object; add fileName and profiles only if provided
	const body: IDataObject = { url: inputUrl, async: true, inline: true };

	// Build body based on option selected
	const splitBy = this.getNodeParameter('splitBy', index) as string;

	if (splitBy === 'searchText') {
		const searchString = this.getNodeParameter('searchString', index) as string;
		if (searchString) body.searchString = searchString;

		// Advanced Options
		const advancedOptions = this.getNodeParameter(
			'advancedOptionsTextSearch',
			index,
		) as IDataObject;

		const caseSensitive = advancedOptions?.caseSensitive as boolean | undefined;
		if (caseSensitive !== undefined) body.caseSensitive = caseSensitive;

		const regexSearch = advancedOptions?.regexSearch as boolean | undefined;
		if (regexSearch !== undefined) body.regexSearch = regexSearch;

		const excludeKeyPages = advancedOptions?.excludeKeyPages as boolean | undefined;
		if (excludeKeyPages !== undefined) body.excludeKeyPages = excludeKeyPages;

		const lang = advancedOptions?.lang as string | undefined;
		if (lang) body.lang = lang;

		const fileName = advancedOptions?.name as string | undefined;
		if (fileName) body.name = fileName;

		const callback = advancedOptions?.callback as string | undefined;
		if (callback) body.callback = callback;

		const expiration = advancedOptions?.expiration as number | undefined;
		if (expiration) body.expiration = expiration;

		const inline = advancedOptions?.inline as boolean | undefined;
		if (inline !== undefined) body.inline = inline;

		const httpusername = advancedOptions?.httpusername as string | undefined;
		if (httpusername) body.httpusername = httpusername;

		const httppassword = advancedOptions?.httppassword as string | undefined;
		if (httppassword) body.httppassword = httppassword;

		const profiles = advancedOptions?.profiles as string | undefined;
		if (profiles) body.profiles = profiles;
	} else if (splitBy === 'barcode') {
		// Search String
		const barcodeSearchString = this.getNodeParameter('barcodeSearchString', index) as string;
		if (barcodeSearchString) body.searchString = barcodeSearchString;

		// Advanced Options
		const advancedOptions = this.getNodeParameter('advancedOptionsBarcode', index) as IDataObject;

		const caseSensitive = advancedOptions?.caseSensitive as boolean | undefined;
		if (caseSensitive !== undefined) body.caseSensitive = caseSensitive;

		const regexSearch = advancedOptions?.regexSearch as boolean | undefined;
		if (regexSearch !== undefined) body.regexSearch = regexSearch;

		const excludeKeyPages = advancedOptions?.excludeKeyPages as boolean | undefined;
		if (excludeKeyPages !== undefined) body.excludeKeyPages = excludeKeyPages;

		const fileName = advancedOptions?.name as string | undefined;
		if (fileName) body.name = fileName;

		const callback = advancedOptions?.callback as string | undefined;
		if (callback) body.callback = callback;

		const expiration = advancedOptions?.expiration as number | undefined;
		if (expiration) body.expiration = expiration;

		const inline = advancedOptions?.inline as boolean | undefined;
		if (inline !== undefined) body.inline = inline;

		const httpusername = advancedOptions?.httpusername as string | undefined;
		if (httpusername) body.httpusername = httpusername;

		const httppassword = advancedOptions?.httppassword as string | undefined;
		if (httppassword) body.httppassword = httppassword;

		const profiles = advancedOptions?.profiles as string | undefined;
		if (profiles) body.profiles = profiles;
	} else {
		//pageNumber
		const pages = this.getNodeParameter('pages', index) as string;
		if (pages) body.pages = pages;

		// Advanced Options
		const advancedOptions = this.getNodeParameter(
			'advancedOptionsPageNumber',
			index,
		) as IDataObject;

		const fileName = advancedOptions?.name as string | undefined;
		if (fileName) body.name = fileName;

		const callback = advancedOptions?.callback as string | undefined;
		if (callback) body.callback = callback;

		const expiration = advancedOptions?.expiration as number | undefined;
		if (expiration) body.expiration = expiration;

		const inline = advancedOptions?.inline as boolean | undefined;
		if (inline !== undefined) body.inline = inline;

		const httpusername = advancedOptions?.httpusername as string | undefined;
		if (httpusername) body.httpusername = httpusername;

		const httppassword = advancedOptions?.httppassword as string | undefined;
		if (httppassword) body.httppassword = httppassword;

		const profiles = advancedOptions?.profiles as string | undefined;
		if (profiles) body.profiles = profiles;
	}

	// Choose endpoint based on autoConvert flag
	const endpoint = splitBy === 'pageNumber' ? `/v1/pdf/split` : `/v1/pdf/split2`;

	// Sanitize the profiles (if present)
	sanitizeProfiles(body);

	// Make the API request and return the response in the expected format
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
