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
		description: 'The URL of the PDF / Image file to read',
		displayOptions: {
			show: {
				operation: [ActionConstants.BarcodeReader],
			},
		},
	},
	{
		displayName: 'Barcode Types',
		name: 'types',
		type: 'multiOptions',
		default: ['QRCode'],
		description: 'Choose the type of barcode to read. By default, the system will look for QR Codes.',
		displayOptions: {
			show: {
				operation: [ActionConstants.BarcodeReader],
			},
		},
		options: [
			{
				name: 'Australian Post Code',
				value: 'AustralianPostCode',
			},
			{
				name: 'Aztec',
				value: 'Aztec',
			},
			{
				name: 'Circular I2of5',
				value: 'CircularI2of5',
			},
			{
				name: 'Codabar',
				value: 'Codabar',
			},
			{
				name: 'Codablock F',
				value: 'CodablockF',
			},
			{
				name: 'Code 128',
				value: 'Code128',
			},
			{
				name: 'Code 16K',
				value: 'Code16K',
			},
			{
				name: 'Code 39',
				value: 'Code39',
			},
			{
				name: 'Code 39 Extended',
				value: 'Code39Extended',
			},
			{
				name: 'Code 39 Mod43',
				value: 'Code39Mod43',
			},
			{
				name: 'Code 39 Mod43 Extended',
				value: 'Code39Mod43Extended',
			},
			{
				name: 'Code 93',
				value: 'Code93',
			},
			{
				name: 'Data Matrix',
				value: 'DataMatrix',
			},
			{
				name: 'EAN-13',
				value: 'EAN13',
			},
			{
				name: 'EAN-2',
				value: 'EAN2',
			},
			{
				name: 'EAN-5',
				value: 'EAN5',
			},
			{
				name: 'EAN-8',
				value: 'EAN8',
			},
			{
				name: 'GS1',
				value: 'GS1',
			},
			{
				name: 'GS1 DataBar Expanded',
				value: 'GS1DataBarExpanded',
			},
			{
				name: 'GS1 DataBar Expanded Stacked',
				value: 'GS1DataBarExpandedStacked',
			},
			{
				name: 'GS1 DataBar Limited',
				value: 'GS1DataBarLimited',
			},
			{
				name: 'GS1 DataBar Omnidirectional',
				value: 'GS1DataBarOmnidirectional',
			},
			{
				name: 'GS1 DataBar Stacked',
				value: 'GS1DataBarStacked',
			},
			{
				name: 'GTIN-12',
				value: 'GTIN12',
			},
			{
				name: 'GTIN-13',
				value: 'GTIN13',
			},
			{
				name: 'GTIN-14',
				value: 'GTIN14',
			},
			{
				name: 'GTIN-8',
				value: 'GTIN8',
			},
			{
				name: 'Intelligent Mail',
				value: 'IntelligentMail',
			},
			{
				name: 'Interleaved 2of5',
				value: 'Interleaved2of5',
			},
			{
				name: 'ITF-14',
				value: 'ITF14',
			},
			{
				name: 'MaxiCode',
				value: 'MaxiCode',
			},
			{
				name: 'MICR',
				value: 'MICR',
			},
			{
				name: 'MicroPDF',
				value: 'MicroPDF',
			},
			{
				name: 'MSI',
				value: 'MSI',
			},
			{
				name: 'Patch Code',
				value: 'PatchCode',
			},
			{
				name: 'PDF417',
				value: 'PDF417',
			},
			{
				name: 'Pharmacode',
				value: 'Pharmacode',
			},
			{
				name: 'PostNet',
				value: 'PostNet',
			},
			{
				name: 'PZN',
				value: 'PZN',
			},
			{
				name: 'QR Code',
				value: 'QRCode',
			},
			{
				name: 'Royal Mail',
				value: 'RoyalMail',
			},
			{
				name: 'Royal Mail KIX',
				value: 'RoyalMailKIX',
			},
			{
				name: 'Trioptic',
				value: 'Trioptic',
			},
			{
				name: 'UPC-A',
				value: 'UPCA',
			},
			{
				name: 'UPC-E',
				value: 'UPCE',
			},
			{
				name: 'UPU',
				value: 'UPU',
			},
		],
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		description: 'Comma-separated list of page numbers to search in. Leave empty to search all pages.',
		displayOptions: {
			show: {
				operation: [ActionConstants.BarcodeReader],
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
				operation: [ActionConstants.BarcodeReader],
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
				displayName: 'Optical Marks Reader',
				name: 'types',
				type: 'string',
				default: '',
				placeholder: 'Checkbox,UnderlinedField',
				description: 'Comma-separated list of additional marks to detect. The barcode reader engine can also find marks like Checkbox, UnderlinedField, etc. on scanned documents',
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
				description: 'Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, index: number) {
	const inputUrl = this.getNodeParameter('url', index) as string;
	const types = this.getNodeParameter('types', index) as string[];
	const pages = this.getNodeParameter('pages', index) as string;
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	const body: IDataObject = {
		url: inputUrl,
		types: types.join(','),
		async: true,
		inline: true,
	};

	if (pages) {
		body.pages = pages;
	}

	// Add advanced options
	const fileName = advancedOptions?.name as string | undefined;
	if (fileName) body.name = fileName;

	const opticalMarks = advancedOptions?.types as string | undefined;
	if (opticalMarks) body.types = opticalMarks;

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

	const responseData = await pdfcoApiRequestWithJobCheck.call(this, '/v1/barcode/read/from/url', body);
	return this.helpers.returnJsonArray(responseData);
}
