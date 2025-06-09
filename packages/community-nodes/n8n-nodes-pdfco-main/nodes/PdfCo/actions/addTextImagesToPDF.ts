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
		description: 'URL to the source PDF file. Use the PDF Inspector tool at https://app.pdf.co/pdf-edit-add-helper to preview and measure coordinates.',
		displayOptions: {
			show: {
				operation: [ActionConstants.AddTextImagesToPDF],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'annotations',
		type: 'fixedCollection',
		placeholder: 'Add Text',
		default: null,
		typeOptions: {
			multipleValues: true,
		},
		description: 'Add text annotations to the PDF. Use the PDF Inspector tool to find exact coordinates.',
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						description: 'Text content to add. Supports macros like [[page]] for page numbers.',
						required: true,
						default: '',
					},
					{
						displayName: 'X',
						name: 'x',
						type: 'string',
						description: 'X coordinate (use PDF Inspector to measure)',
						required: true,
						default: '',
					},
					{
						displayName: 'Y',
						name: 'y',
						type: 'string',
						description: 'Y coordinate (use PDF Inspector to measure)',
						required: true,
						default: '',
					},
					{
						displayName: 'Font Size',
						name: 'size',
						type: 'string',
						description: 'The font size of the text',
						default: '',
					},
					{
						displayName: 'Font Color',
						name: 'color',
						type: 'color',
						description: 'The color of the text',
						default: '#000000',
					},

					{
						displayName: 'Font Bold',
						name: 'fontBold',
						type: 'boolean',
						description: 'Whether the text is bold',
						default: false,
					},
					{
						displayName: 'Italic',
						name: 'fontItalic',
						type: 'boolean',
						description: 'Whether the text is italic',
						default: false,
					},
					{
						displayName: 'Strikeout',
						name: 'fontStrikeout',
						type: 'boolean',
						description: 'Whether the text is strikethrough',
						default: false,
					},
					{
						displayName: 'Font Underline',
						name: 'fontUnderline',
						type: 'boolean',
						description: 'Whether the text is underlined',
						default: false,
					},
					{
						displayName: 'Font Name or ID',
						name: 'fontName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFonts',
						},
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						default: '',
						placeholder: 'arial',
					},
					{
						displayName: 'Pages',
						name: 'pages',
						type: 'string',
						description: 'Page numbers (e.g., 0,1-2,5,7-). Use -2 for second page from last.',
						default: '0',
						placeholder: '0',
					},
						{
							displayName: 'Link',
							name: 'link',
							type: 'string',
							description: 'Sets link on click for text',
							default: '',
							placeholder: 'https://example.com',
						},
							{
								displayName: 'Width',
								name: 'width',
								type: 'number',
								description: 'Width of the text box',
								default: '',
							},
							{
								displayName: 'Height',
								name: 'height',
								type: 'number',
								description: 'Height of the text box',
								default: '',
							},
							{
								displayName: 'Alignment',
								name: 'alignment',
								type: 'options',
								description: 'Sets text alignment within the width of the text box',
								default: 'left',
								options: [
									{
										name: 'Left',
										value: 'left',
									},
									{
										name: 'Center',
										value: 'center',
									},
									{
										name: 'Right',
										value: 'right',
									},
								],
							},
							{
								displayName: 'Transparent',
								name: 'transparent',
								type: 'boolean',
								description: 'Whether the text is transparent',
								default: true,
							},
				],
			},
		],
		displayOptions: {
			show: {
				operation: [ActionConstants.AddTextImagesToPDF],
			},
		},
	},
	{
		displayName: 'Images',
		name: 'images',
		type: 'fixedCollection',
		placeholder: 'Add Image',
		default: null,
		typeOptions: {
			multipleValues: true,
		},
		description: 'Add images to the PDF. Use the PDF Inspector tool to find exact coordinates.',
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Image Url',
						name: 'imageUrl',
						type: 'string',
						description: 'URL to image or base64 encoded image data',
						required: true,
						default: '',
					},
					{
						displayName: 'X',
						name: 'x',
						type: 'number',
						description: 'X coordinate (use PDF Inspector to measure)',
						required: true,
						default: '',
					},
					{
						displayName: 'Y',
						name: 'y',
						type: 'number',
						description: 'Y coordinate (use PDF Inspector to measure)',
						required: true,
						default: '',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						description: 'Image width in points. Leave empty for auto-detect.',
						default: '',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						description: 'Image height in points. Leave empty for auto-detect.',
						default: '',
					},
					{
						displayName: 'Pages',
						name: 'pages',
						type: 'string',
						description: 'Page numbers (e.g., 0,1-2,5,7-). Use -2 for second page from last.',
						default: '0',
						placeholder: '0',
					},
					{
						displayName: 'Link',
						name: 'link',
						type: 'string',
						description: 'Sets link on click for image',
						default: '',
						placeholder: 'https://example.com',
					},
					{
						displayName: 'Keep Aspect Ratio',
						name: 'keepAspectRatio',
						type: 'boolean',
						description: 'Whether to keep the aspect ratio of the image',
						default: true,
					},
				],
			},
		],
		displayOptions: {
			show: {
				operation: [ActionConstants.AddTextImagesToPDF],
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
				operation: [ActionConstants.AddTextImagesToPDF],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Custom name for the output file. If empty, uses input file name.',
			},
			{
				displayName: 'Webhook URL',
				name: 'callback',
				type: 'string', // You can also use "url" if you want built-in URL validation.
				default: '',
				description: 'The callback URL or Webhook used to receive the output data',
				placeholder: 'https://example.com/callback',
				//hint: 'The callback URL or Webhook used to receive the output data.',
			},
			{
				displayName: 'Output Links Expiration (In Minutes)',
				name: 'expiration',
				type: 'number',
				default: 60,
				description: 'Time in minutes before output links expire',
			},
			{
				displayName: 'Custom Profiles',
				name: 'profiles',
				type: 'string',
				default: '',
				placeholder: `{ 'outputDataFormat': 'base64' }`,
				description: 'Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.',
				//hint: `Use "JSON" to adjust custom properties. Review Profiles at https://developer.pdf.co/api/profiles/index.html to set extra options for API calls and may be specific to certain APIs.`,
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

	// Retrieve the entire fixedCollection object for 'annotations'
	const annotations = this.getNodeParameter('annotations', index) as IDataObject;
	const annotationsMetadata = annotations.metadataValues as IDataObject[] | undefined;
	if (annotationsMetadata && Array.isArray(annotationsMetadata)) {
		const lstAnnotations = [] as IDataObject[];
		for (const entry of annotationsMetadata) {
			// Access each individual field
			const text = entry?.text as string;
			const x = entry.x as number;
			const y = entry.y as number;

			let itmAnnotation: any = { text, x, y };

			const size = entry.size as string | undefined;
			if (size) itmAnnotation.size = size;

			const color = entry.color as string | undefined;
			if (color) itmAnnotation.color = color;

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

			const pages = entry.pages as string | undefined;
			if (pages) itmAnnotation.pages = pages;

			const link = entry.link as string | undefined;
			if (link) itmAnnotation.link = link;

			const width = entry.width as number | undefined;
			if (width) itmAnnotation.width = width;

			const height = entry.height as number | undefined;
			if (height) itmAnnotation.height = height;

			const alignment = entry.alignment as string | undefined;
			if (alignment) itmAnnotation.alignment = alignment;

			const transparent = entry.transparent as boolean | undefined;
			if (transparent !== undefined) itmAnnotation.transparent = transparent;

			lstAnnotations.push(itmAnnotation);
		}
		body.annotations = lstAnnotations;
	}

	//Retrieve the entire fixedCollection object for 'images'
	const images = this.getNodeParameter('images', index) as IDataObject;
	const imagesMetadata = images.metadataValues as IDataObject[] | undefined;
	if (imagesMetadata && Array.isArray(imagesMetadata)) {
		const lstImages = [] as IDataObject[];
		for (const entry of imagesMetadata) {
			// Access each individual field
			const imageUrl = entry?.imageUrl as string;
			const x = entry.x as number;
			const y = entry.y as number;

			let itmImg: any = { url: imageUrl, x, y };

			const width = entry.width as number | undefined;
			if (width) itmImg.width = width;

			const height = entry.height as number | undefined;
			if (height) itmImg.height = height;

			const pages = entry.pages as string | undefined;
			if (pages) itmImg.pages = pages;

			const link = entry.link as string | undefined;
			if (link) itmImg.link = link;

			const keepAspectRatio = entry.keepAspectRatio as boolean | undefined;
			if (keepAspectRatio !== undefined) itmImg.keepAspectRatio = keepAspectRatio;

			lstImages.push(itmImg);
		}
		body.images = lstImages;
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
