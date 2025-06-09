import type { INodeProperties } from 'n8n-workflow';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import {
	pdfcoApiRequestWithJobCheck,
	sanitizeProfiles,
	ActionConstants,
} from '../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Convert Type',
		name: 'convertType',
		type: 'options',
		options: [
			{
				name: 'CSV to PDF',
				value: 'fromCsv',
			},
			{
				name: 'Document to PDF (RTF, DOC, DOCX, TXT)',
				value: 'fromDocument',
			},
			{
				name: 'Email to PDF (MSG or EML)',
				value: 'fromEmail',
			},
			{
				name: 'Image to PDF (JPG, PNG, TIFF)',
				value: 'fromImage',
			},
			{
				name: 'XLS to PDF',
				value: 'fromXls',
			},
			{
				name: 'XLSX to PDF',
				value: 'fromXlsx',
			},
		],
		default: 'fromDocument',
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertToPDF],
			},
		},
	},
	{
		displayName: 'Url',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'The URL of the file to convert',
		//placeholder: 'https://example.com/invoice.pdf',
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertToPDF],
			},
		},
	},
	{
		displayName: 'Worksheet Index',
		name: 'worksheetIndex',
		type: 'string',
		default: '',
		placeholder: '0',
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertToPDF],
				convertType: ['fromXls', 'fromXlsx'],
			},
		},
	},
	{
		displayName: 'Advanced Options',
		name: 'advancedOptionsCommon',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertToPDF],
				convertType: ['fromDocument', 'fromXls', 'fromXlsx', 'fromImage'],
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
		name: 'advancedOptionsCsv',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertToPDF],
				convertType: ['fromCsv'],
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
				displayName: 'Auto Size',
				name: 'autosize',
				type: 'boolean',
				default: true,
				description: 'Whether to automatically size pages',
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
	{
		displayName: 'Advanced Options',
		name: 'advancedOptionsEmail',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.ConvertToPDF],
				convertType: ['fromEmail'],
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
				displayName: 'Embeds Attachments',
				name: 'embedAttachments',
				type: 'boolean',
				default: true,
				description: 'Whether to embed attachments in the PDF',
			},
			{
				displayName: 'Convert Attachments to PDF',
				name: 'convertAttachments',
				type: 'boolean',
				default: true,
				description: 'Whether to convert attachments to PDF',
			},
			{
				displayName: 'Margins',
				name: 'margins',
				type: 'string',
				placeholder: '`10px`, `5mm`, `5in`, `5px 5px 5px 5px`',
				default: '',
				description: 'The margins of the PDF',
			},
			{
				displayName: 'Orientation',
				name: 'orientation',
				type: 'options',
				options: [
					{
						name: 'Portrait',
						value: 'portrait',
					},
					{
						name: 'Landscape',
						value: 'landscape',
					},
				],
				default: 'portrait',
				description: 'The orientation of the PDF',
			},
			{
				displayName: 'Paper Size',
				name: 'paperSize',
				type: 'options',
				options: [
					{ name: 'A0', value: 'a0' },
					{ name: 'A1', value: 'a1' },
					{ name: 'A2', value: 'a2' },
					{ name: 'A3', value: 'a3' },
					{ name: 'A4', value: 'a4' },
					{ name: 'A5', value: 'a5' },
					{ name: 'A6', value: 'a6' },
					{ name: 'Custom', value: 'custom' },
					{ name: 'Legal', value: 'legal' },
					{ name: 'Letter', value: 'letter' },
					{ name: 'Tabloid', value: 'tabloid' },
				],
				default: 'letter',
			},
			{
				displayName: 'Custom Paper Size',
				name: 'custom',
				type: 'string',
				default: '',
				description: 'The custom paper size of the PDF',
				placeholder: '`200 300`, `200px 300px`, `200mm 300mm`, `20cm 30cm` or `6in 8in`',
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
	// Build body based on option selected
	const convertType = this.getNodeParameter('convertType', index) as string;

	// Build the payload object
	const body: IDataObject = { async: true };
	let endpoint: string = '';

	// Retrieve the "url" parameter.
	const inputUrl = this.getNodeParameter('url', index) as string | undefined;
	if (inputUrl) body.url = inputUrl;

	if (convertType === 'fromDocument') {
		endpoint = '/v1/pdf/convert/from/doc';
	} else if (convertType === 'fromCsv') {
		endpoint = '/v1/pdf/convert/from/csv';
	} else if (convertType === 'fromXls' || convertType === 'fromXlsx') {
		if (convertType === 'fromXls') {
			endpoint = '/v1/xls/convert/to/pdf';
		} else if (convertType === 'fromXlsx') {
			endpoint = '/v1/xlsx/convert/to/pdf';
		}

		const worksheetIndex = this.getNodeParameter('worksheetIndex', index) as string | undefined;
		if (worksheetIndex && !isNaN(Number(worksheetIndex))) {
			endpoint = '/v1/xls/convert/to/pdf';
			body.worksheetIndex = worksheetIndex;
		}
	} else if (convertType === 'fromImage') {
		endpoint = '/v1/pdf/convert/from/image';
	} else if (convertType === 'fromEmail') {
		endpoint = '/v1/pdf/convert/from/email';
	}

	// Advanced Options
	if (convertType === 'fromEmail') {
		const advancedOptionsEmail = this.getNodeParameter('advancedOptionsEmail', index) as IDataObject;

		const fileName = advancedOptionsEmail?.name as string | undefined;
		if (fileName) body.name = fileName;

		const callback = advancedOptionsEmail?.callback as string | undefined;
		if (callback) body.callback = callback;

		const expiration = advancedOptionsEmail?.expiration as number | undefined;
		if (expiration) body.expiration = expiration;

		const profiles = advancedOptionsEmail?.profiles as string | undefined;
		if (profiles) body.profiles = profiles;

		const embedAttachments = advancedOptionsEmail?.embedAttachments as boolean | true;
		body.embedAttachments = embedAttachments;

		const convertAttachments = advancedOptionsEmail?.convertAttachments as boolean | true;
		body.convertAttachments = convertAttachments;

		const orientation = advancedOptionsEmail?.orientation as string | undefined;
		if (orientation) body.orientation = orientation;

		const paperSize = advancedOptionsEmail?.paperSize as string | undefined;
		if (paperSize) body.paperSize = paperSize;

		const custom = advancedOptionsEmail?.custom as string | undefined;
		if (custom) body.paperSize = custom;

		const margins = advancedOptionsEmail?.margins as string | undefined;
		if (margins) body.margins = margins;
	} else if (convertType === 'fromCsv') {
		const advancedOptionsCsv = this.getNodeParameter('advancedOptionsCsv', index) as IDataObject;

		const fileName = advancedOptionsCsv?.name as string | undefined;
		if (fileName) body.name = fileName;

		const callback = advancedOptionsCsv?.callback as string | undefined;
		if (callback) body.callback = callback;

		const expiration = advancedOptionsCsv?.expiration as number | undefined;
		if (expiration) body.expiration = expiration;

		const httpusername = advancedOptionsCsv?.httpusername as string | undefined;
		if (httpusername) body.httpusername = httpusername;

		const httppassword = advancedOptionsCsv?.httppassword as string | undefined;
		if (httppassword) body.httppassword = httppassword;

		const profiles = advancedOptionsCsv?.profiles as string | undefined;
		if (profiles) body.profiles = profiles;

		const autosize = advancedOptionsCsv?.autosize as boolean | undefined;
		if (autosize !== undefined) body.autosize = autosize;
	} else {
		const advancedOptions = this.getNodeParameter('advancedOptionsCommon', index) as IDataObject;

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
	}

	// Sanitize the profiles (if present)
	sanitizeProfiles(body);

	// Make the API request and return the response in the expected format
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
