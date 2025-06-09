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
		description: 'The URL of the PDF file to convert',
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertFromPDF],
			},
		},
	},
	{
		displayName: 'Convert Type',
		name: 'convertType',
		type: 'options',
		options: [
			{
				name: 'PDF to CSV',
				value: 'toCsv',
			},
			{
				name: 'PDF to HTML',
				value: 'toHtml',
			},
			{
				name: 'PDF to JPG',
				value: 'toJpg',
			},
			{
				name: 'PDF to JSON (Legacy)',
				value: 'toJson',
			},
			{
				name: 'PDF to JSON-Meta (Headers and Styles)',
				value: 'toJsonMeta',
			},
			{
				name: 'PDF to JSON2 (Text Objects and Structure)',
				value: 'toJson2',
			},
			{
				name: 'PDF to PNG',
				value: 'toPng',
			},
			{
				name: 'PDF to Text',
				value: 'toText',
			},
			{
				name: 'PDF to Text (No Layout & Fast)',
				value: 'toTextSimple',
			},
			{
				name: 'PDF to TIFF',
				value: 'toTiff',
			},
			{
				name: 'PDF to WEBP',
				value: 'toWebp',
			},
			{
				name: 'PDF to XLS',
				value: 'toXls',
			},
			{
				name: 'PDF to XLSX',
				value: 'toXlsx',
			},
			{
				name: 'PDF to XML',
				value: 'toXml',
			},
		],
		default: 'toText',
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertFromPDF],
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
				operation: [ActionConstants.ConvertFromPDF],
				convertType: [
					'toCsv',
					'toHtml',
					'toJson',
					'toJsonMeta',
					'toJson2',
					'toText',
					'toXls',
					'toXlsx',
					'toXml',
				],
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
				default: '',
				placeholder: '0',
				description: 'The pages to convert',
			},
			{
				displayName: 'Inline',
				name: 'inline',
				type: 'boolean',
				default: true,
				description: 'Whether to return the output in the response',
			},
			{
				displayName: 'Line Grouping',
				name: 'lineGrouping',
				type: 'boolean',
				default: false,
				description: 'Whether to group lines into table cells',
			},
			{
				displayName: 'Unwrap',
				name: 'unwrap',
				type: 'boolean',
				default: false,
				description:
					'Whether to unwrap lines into a single line within table cells when lineGrouping is enabled',
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
				description:
					'The language of the OCR for Scanned Documents. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Extraction Region',
				name: 'rect',
				type: 'string',
				default: '',
				placeholder: '51.8, 114.8, 235.5, 204.0',
				description: 'The region of the document to extract',
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
				description: 'The expiration time of the output links',
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
				description:
					'Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.',
			},
		],
	},
	{
		displayName: 'Advanced Options',
		name: 'advancedOptions_Image',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertFromPDF],
				convertType: ['toJpg', 'toPng', 'toWebp', 'toTiff'],
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
				default: '',
				placeholder: '0',
				description: 'The pages to convert',
			},
			{
				displayName: 'Inline',
				name: 'inline',
				type: 'boolean',
				default: true,
				description: 'Whether to return the output in the response',
			},
			{
				displayName: 'Extraction Region',
				name: 'rect',
				type: 'string',
				default: '',
				placeholder: '51.8, 114.8, 235.5, 204.0',
				description: 'The region of the document to extract',
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
				description: 'The expiration time of the output links',
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
				description:
					'Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.',
			},
		],
	},
	{
		displayName: 'Advanced Options',
		name: 'advancedOptions_TextSimple',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertFromPDF],
				convertType: ['toTextSimple'],
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
				default: '',
				placeholder: '0',
				description: 'The pages to convert',
			},
			{
				displayName: 'Inline',
				name: 'inline',
				type: 'boolean',
				default: true,
				description: 'Whether to return the output in the response',
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
				description: 'The expiration time of the output links',
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
				description:
					'Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, index: number) {
	// Build body based on option selected
	const convertType = this.getNodeParameter('convertType', index) as string;

	// Build the payload object
	const body: IDataObject = { async: true, inline: true };
	let endpoint: string = '';

	// Retrieve the "url" parameter.
	const inputUrl = this.getNodeParameter('url', index) as string | undefined;
	if (inputUrl) body.url = inputUrl;

	if (convertType === 'toCsv') {
		endpoint = '/v1/pdf/convert/to/csv';
	} else if (convertType === 'toHtml') {
		endpoint = '/v1/pdf/convert/to/html';
	} else if (convertType === 'toJpg') {
		endpoint = '/v1/pdf/convert/to/jpg';
	} else if (convertType === 'toJson') {
		endpoint = '/v1/pdf/convert/to/json';
	} else if (convertType === 'toJsonMeta') {
		endpoint = '/v1/pdf/convert/to/json-meta';
	} else if (convertType === 'toJson2') {
		endpoint = '/v1/pdf/convert/to/json2';
	} else if (convertType === 'toPng') {
		endpoint = '/v1/pdf/convert/to/png';
	} else if (convertType === 'toText') {
		endpoint = '/v1/pdf/convert/to/text';
	} else if (convertType === 'toTextSimple') {
		endpoint = '/v1/pdf/convert/to/text-simple';
	} else if (convertType === 'toTiff') {
		endpoint = '/v1/pdf/convert/to/tiff';
	} else if (convertType === 'toXls') {
		endpoint = '/v1/pdf/convert/to/xls';
	} else if (convertType === 'toXlsx') {
		endpoint = '/v1/pdf/convert/to/xlsx';
	} else if (convertType === 'toXml') {
		endpoint = '/v1/pdf/convert/to/xml';
	} else if (convertType === 'toWebp') {
		endpoint = '/v1/pdf/convert/to/webp';
	}

	if (
		convertType === 'toJpg' ||
		convertType === 'toPng' ||
		convertType === 'toWebp' ||
		convertType === 'toTiff'
	) {
		const advancedOptions = this.getNodeParameter('advancedOptions_Image', index) as IDataObject;

		const pages = advancedOptions?.pages as string | undefined;
		if (pages) body.pages = pages;

		const fileName = advancedOptions?.name as string | undefined;
		if (fileName) body.name = fileName;

		const rect = advancedOptions?.rect as string | undefined;
		if (rect) body.rect = rect;

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
	} else if (convertType === 'toTextSimple') {
		const advancedOptions = this.getNodeParameter(
			'advancedOptions_TextSimple',
			index,
		) as IDataObject;

		const pages = advancedOptions?.pages as string | undefined;
		if (pages) body.pages = pages;

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
		const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

		const pages = advancedOptions?.pages as string | undefined;
		if (pages) body.pages = pages;

		const fileName = advancedOptions?.name as string | undefined;
		if (fileName) body.name = fileName;

		const lang = advancedOptions?.lang as string | undefined;
		if (lang) body.lang = lang;

		const rect = advancedOptions?.rect as string | undefined;
		if (rect) body.rect = rect;

		const callback = advancedOptions?.callback as string | undefined;
		if (callback) body.callback = callback;

		const expiration = advancedOptions?.expiration as number | undefined;
		if (expiration) body.expiration = expiration;

		const inline = advancedOptions?.inline as boolean | undefined;
		if (inline !== undefined) body.inline = inline;

		const lineGrouping = advancedOptions?.lineGrouping as boolean | undefined;
		if (lineGrouping) {
			body.lineGrouping = '1';

			const unwrap = advancedOptions?.unwrap as boolean | undefined;
			if (unwrap !== undefined) body.unwrap = unwrap;
		}

		const httpusername = advancedOptions?.httpusername as string | undefined;
		if (httpusername) body.httpusername = httpusername;

		const httppassword = advancedOptions?.httppassword as string | undefined;
		if (httppassword) body.httppassword = httppassword;

		const profiles = advancedOptions?.profiles as string | undefined;
		if (profiles) body.profiles = profiles;
	}

	// Sanitize the profiles (if present)
	sanitizeProfiles(body);

	// Make the API request and return the response in the expected format
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
