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
		description: 'The URL of the PDF file to fill',
		displayOptions: {
			show: {
				operation: [ActionConstants.FillPdfForm],
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'fixedCollection',
		placeholder: 'Add Field Data',
		default: null,
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'string',
						required: true,
						default: '',
						description: 'The name of the field to fill',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'The text to fill in the field',
					},
					{
						displayName: 'Pages',
						name: 'pages',
						type: 'string',
						default: '0',
						placeholder: '0',
						description: 'The pages to fill the field on',
					},
					{
						displayName: 'Font Size',
						name: 'size',
						type: 'string',
						default: '',
						description: 'The size of the font to use',
					},
					{
						displayName: 'Font Bold',
						name: 'fontBold',
						type: 'boolean',
						default: false,
						description: 'Whether the font should be bold',
					},
					{
						displayName: 'Italic',
						name: 'fontItalic',
						type: 'boolean',
						default: false,
						description: 'Whether the font should be italic',
					},
					{
						displayName: 'Strikeout',
						name: 'fontStrikeout',
						type: 'boolean',
						default: false,
						description: 'Whether the font should be strikethrough',
					},
					{
						displayName: 'Font Underline',
						name: 'fontUnderline',
						type: 'boolean',
						default: false,
						description: 'Whether the font should be underlined',
					},
					{
						displayName: 'Font Name or ID',
						name: 'fontName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFonts',
						},
						default: '',
						placeholder: 'Arial',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
					},

				],
			},
		],
		displayOptions: {
			show: {
				operation: [ActionConstants.FillPdfForm],
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
				operation: [ActionConstants.FillPdfForm],
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
				description: 'The expiration time of the output links',
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
	// Define endpoint
	const endpoint = `/v1/pdf/edit/add`;

	// Retrieve the "url" parameter.
	const inputUrl = this.getNodeParameter('url', index) as string;

	// Build the payload object; add fileName and profiles only if provided
	const body: IDataObject = { url: inputUrl, inline: true, async: true };

	// Retrieve the entire fixedCollection object for 'fields'
	const fields = this.getNodeParameter('fields', index) as IDataObject;
	const fieldsMetadata = fields.metadataValues as IDataObject[] | undefined;
	if (fieldsMetadata && Array.isArray(fieldsMetadata)) {
		const lstFields = [] as IDataObject[];
		for (const entry of fieldsMetadata) {
			// Access each individual field
			const fieldName = entry?.fieldName as string;

			let itmAnnotation: any = { fieldName };

			const text = entry.text as string | undefined;
			if (text) itmAnnotation.text = text;

			const pages = entry.pages as string | undefined;
			if (pages) itmAnnotation.pages = pages;

			const size = entry.size as string | undefined;
			if (size) itmAnnotation.size = size;

			const fontBold = entry.fontBold as boolean | false;
			if (fontBold) itmAnnotation.fontBold = fontBold;

			const fontItalic = entry.fontItalic as boolean | false;
			if (fontItalic) itmAnnotation.fontItalic = fontItalic;

			const fontStrikeout = entry.fontStrikeout as boolean | false;
			if (fontStrikeout) itmAnnotation.fontStrikeout = fontStrikeout;

			const fontUnderline = entry.fontUnderline as boolean | false;
			if (fontUnderline) itmAnnotation.fontUnderline = fontUnderline;

			const fontName = entry.fontName as string | undefined;
			if (fontName) itmAnnotation.fontName = fontName;

			lstFields.push(itmAnnotation);
		}
		body.fields = lstFields;
	}

	// Retrieve advanced options (returns an empty object if not provided)
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	// Retrieve optional values from advanced options using optional chaining
	const fileName = advancedOptions?.name as string | undefined;
	if (fileName) body.name = fileName;

	const profiles = advancedOptions?.profiles as string | undefined;
	if (profiles) body.profiles = profiles;

	const callback = advancedOptions?.callback as string | undefined;
	if (callback) body.callback = callback;

	const expiration = advancedOptions?.expiration as number | undefined;
	if (expiration) body.expiration = expiration;

	// Sanitize the profiles (if present)
	sanitizeProfiles(body);

	// Make the API request and return the response in the expected format
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
