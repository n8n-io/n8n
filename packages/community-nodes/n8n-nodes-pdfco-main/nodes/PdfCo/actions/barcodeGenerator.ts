import type { INodeProperties } from 'n8n-workflow';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import {
	pdfcoApiRequest,
	sanitizeProfiles,
	ActionConstants,
} from '../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Barcode Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		description: 'Enter the value you want to encode into the barcode',
		displayOptions: {
			show: {
				operation: [ActionConstants.BarcodeGenerator],
			},
		},
	},
	{
		displayName: 'Barcode Type',
		name: 'type',
		type: 'options',
		default: 'QRCode',
		description: 'Select the type of barcode to generate. By default, a QR Code will be generated.',
		displayOptions: {
			show: {
				operation: [ActionConstants.BarcodeGenerator],
			},
		},
		options: [
			{
				name: 'Aztec',
				value: 'Aztec',
			},
			{
				name: 'Bookland',
				value: 'Bookland',
			},
			{
				name: 'Codabar',
				value: 'Codabar',
			},
			{
				name: 'Code 128',
				value: 'Code128',
			},
			{
				name: 'Code 39',
				value: 'Code39',
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
				name: 'Deutsche Post Identcode',
				value: 'DeutschePostIdentcode',
			},
			{
				name: 'Deutsche Post Leitcode',
				value: 'DeutschePostLeitcode',
			},
			{
				name: 'Dutch KIX',
				value: 'DutchKix',
			},
			{
				name: 'EAN-128',
				value: 'EAN128',
			},
			{
				name: 'EAN-13',
				value: 'EAN13',
			},
			{
				name: 'EAN-14',
				value: 'EAN14',
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
				name: 'GS1 DataBar Expanded',
				value: 'GS1_DataBar_Expanded',
			},
			{
				name: 'GS1 DataBar Expanded Stacked',
				value: 'GS1_DataBar_Expanded_Stacked',
			},
			{
				name: 'GS1 DataBar Limited',
				value: 'GS1_DataBar_Limited',
			},
			{
				name: 'GS1 DataBar Omnidirectional',
				value: 'GS1_DataBar_Omnidirectional',
			},
			{
				name: 'GS1 DataBar Stacked',
				value: 'GS1_DataBar_Stacked',
			},
			{
				name: 'GS1 DataBar Stacked Omnidirectional',
				value: 'GS1_DataBar_Stacked_Omnidirectional',
			},
			{
				name: 'GS1 DataBar Truncated',
				value: 'GS1_DataBar_Truncated',
			},
			{
				name: 'GS1 DataMatrix',
				value: 'GS1_DataMatrix',
			},
			{
				name: 'GS1-128',
				value: 'GS1_128',
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
				value: 'I2of5',
			},
			{
				name: 'ISBN',
				value: 'ISBN',
			},
			{
				name: 'ITF-14',
				value: 'ITF14',
			},
			{
				name: 'JAN-13',
				value: 'JAN13',
			},
			{
				name: 'Macro PDF417',
				value: 'MacroPDF417',
			},
			{
				name: 'MaxiCode',
				value: 'MaxiCode',
			},
			{
				name: 'Micro PDF417',
				value: 'MicroPDF417',
			},
			{
				name: 'MSI',
				value: 'MSI',
			},
			{
				name: 'Numly',
				value: 'Numly',
			},
			{
				name: 'Optical Product',
				value: 'OpticalProduct',
			},
			{
				name: 'PDF417',
				value: 'PDF417',
			},
			{
				name: 'PDF417 Truncated',
				value: 'PDF417Truncated',
			},
			{
				name: 'Planet',
				value: 'Planet',
			},
			{
				name: 'Plessey',
				value: 'Plessey',
			},
			{
				name: 'Postnet',
				value: 'Postnet',
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
				name: 'Singapore Postal Code',
				value: 'SingaporePostalCode',
			},
			{
				name: 'Swiss Post Parcel',
				value: 'SwissPostParcel',
			},
			{
				name: 'Telepen',
				value: 'Telepen',
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
				name: 'USPS Sack Label',
				value: 'USPSSackLabel',
			},
			{
				name: 'USPS Tray Label',
				value: 'USPSTrayLabel',
			},
		],
	},
	{
		displayName: 'Decoration Image',
		name: 'decorationImage',
		type: 'string',
		default: '',
		description: 'Set this to the image that you want to be inserted the logo inside the QR-Code barcode',
		displayOptions: {
			show: {
				operation: [ActionConstants.BarcodeGenerator],
				type: ['QRCode'],
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
				operation: [ActionConstants.BarcodeGenerator],
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
				displayName: 'Generate Inline URL',
				name: 'inline',
				type: 'boolean',
				default: false,
				description: 'Whether to generate an inline image URL',
			},
			{
				displayName: 'Custom Profiles',
				name: 'profiles',
				type: 'string',
				default: '',
				description: 'Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.',
				placeholder: `{ 'outputDataFormat': 'base64' }`,
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, index: number) {
	const value = this.getNodeParameter('value', index) as string;
	const type = this.getNodeParameter('type', index) as string;

	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	const body: IDataObject = {
		value,
		type,
	};

	const decorationImage = this.getNodeParameter('decorationImage', index) as string;
	if (decorationImage) body.decorationImage = decorationImage;

	const fileName = advancedOptions?.name as string | undefined;
	if (fileName) body.name = fileName;

	const profiles = advancedOptions?.profiles as string | undefined;
	if (profiles) body.profiles = profiles;

	const inline = advancedOptions?.inline as boolean | undefined;
	if (inline !== undefined) body.inline = inline;

	sanitizeProfiles(body);

	const responseData = await pdfcoApiRequest.call(this, '/v1/barcode/generate', body);
	return this.helpers.returnJsonArray(responseData);
}
