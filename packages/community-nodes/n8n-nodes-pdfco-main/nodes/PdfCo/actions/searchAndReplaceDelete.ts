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
		description: 'The URL of the PDF file to search and replace text in',
		placeholder: 'https://example.com/document.pdf',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchAndReplaceDelete],
			},
		},
	},
	{
		displayName: 'Operation Type',
		name: 'operationType',
		type: 'options',
		options: [
			{
				name: 'Search and Delete Text',
				value: 'delete',
				description: 'Find and remove specific text from the PDF',
			},
			{
				name: 'Search and Replace Text',
				value: 'replace',
				description: 'Find and replace specific text in the PDF',
			},
			{
				name: 'Search and Replace with Image',
				value: 'replaceWithImage',
				description: 'Find text and replace it with an image',
			},
		],
		default: 'replace',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchAndReplaceDelete],
			},
		},
	},
	{
		displayName: 'Search and Delete Text',
		name: 'deleteOperations',
		type: 'fixedCollection',
		placeholder: 'Add Search and Delete Text',
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
						displayName: 'Search Text',
						name: 'searchString',
						type: 'string',
						default: '',
						description: 'Text to search for in the PDF',
						placeholder: 'e.g.: company name',
					},
				],
			},
		],
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchAndReplaceDelete],
				operationType: ['delete'],
			},
		},
	},
	{
		displayName: 'Search and Replace Text',
		name: 'replaceOperations',
		type: 'fixedCollection',
		placeholder: 'Add Search and Replace Text',
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
						displayName: 'Search Text',
						name: 'searchString',
						type: 'string',
						required: true,
						default: '',
						description: 'Text to search for in the PDF',
						placeholder: 'e.g.: old company name',
					},
					{
						displayName: 'Replacement Text',
						name: 'replaceString',
						type: 'string',
						required: true,
						default: '',
						description: 'Text to replace the found text with',
						placeholder: 'e.g.: new company name',
					},
				],
			},
		],
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchAndReplaceDelete],
				operationType: ['replace'],
			},
		},
	},
	{
		displayName: 'Search Text',
		name: 'searchStringForReplaceWithImage',
		type: 'string',
		required: true,
		default: '',
		description: 'Text to search for in the PDF',
		placeholder: 'e.g.: company name',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchAndReplaceDelete],
				operationType: ['replaceWithImage'],
			},
		},
	},
	{
		displayName: 'Replacement Image URL',
		name: 'replaceImage',
		type: 'string',
		required: true,
		default: '',
		description: 'URL of the image to replace the found text with',
		placeholder: 'e.g.: https://example.com/image.png',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchAndReplaceDelete],
				operationType: ['replaceWithImage'],
			},
		},
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of page numbers to search in. Leave empty to search all pages.',
		displayOptions: {
			show: {
				operation: [ActionConstants.SearchAndReplaceDelete],
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
				operation: [ActionConstants.SearchAndReplaceDelete],
			},
		},
		options: [
			{
				displayName: 'Replacement Limit',
				name: 'replacementLimit',
				type: 'number',
				default: 0,
				description: 'Limit the number of replacements per search term (0 for unlimited)',
			},
			{
				displayName: 'Use Regular Expressions',
				name: 'regexSearch',
				type: 'boolean',
				default: false,
				description: 'Whether to use regular expressions for more complex search patterns',
			},
			{
				displayName: 'Case Sensitive',
				name: 'caseSensitive',
				type: 'boolean',
				default: false,
				description: 'Whether to make the search case-sensitive',
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
	const inputUrl = this.getNodeParameter('url', index) as string;
	const operationType = this.getNodeParameter('operationType', index) as string;

	const body: IDataObject = {
		url: inputUrl,
		async: true,
		inline: true,
	};

	// Add operation-specific parameters
	if (operationType === 'delete') {
		//Retrieve the entire fixedCollection object for 'deleteOperations'
		const deleteOperations = this.getNodeParameter('deleteOperations', index) as IDataObject;
		const deleteOperationsMetadata = deleteOperations.metadataValues as IDataObject[] | undefined;
		if (deleteOperationsMetadata && Array.isArray(deleteOperationsMetadata)) {
			const lstSearchStrings = [] as string[];
			for (const entry of deleteOperationsMetadata) {
				// Access each individual field
				const searchString = entry?.searchString as string;

				if (searchString) {
					lstSearchStrings.push(searchString);
				}
			}
			body.searchStrings = lstSearchStrings;
		}
	} else if (operationType === 'replace') {
		const replaceOperations = this.getNodeParameter('replaceOperations', index) as IDataObject;
		const replaceOperationsMetadata = replaceOperations.metadataValues as IDataObject[] | undefined;
		if (replaceOperationsMetadata && Array.isArray(replaceOperationsMetadata)) {
			const lstSearchStrings = [] as string[];
			const lstReplaceStrings = [] as string[];
			for (const entry of replaceOperationsMetadata) {
				// Access each individual field
				const searchString = entry?.searchString as string;
				const replaceString = entry?.replaceString as string;

				if (searchString) {
					lstSearchStrings.push(searchString);
				}

				if (replaceString) {
					lstReplaceStrings.push(replaceString);
				}
			}
			body.searchStrings = lstSearchStrings;
			body.replaceStrings = lstReplaceStrings;
		}

	} else if (operationType === 'replaceWithImage') {
		const searchStringForReplaceWithImage = this.getNodeParameter(
			'searchStringForReplaceWithImage',
			index,
		) as string;
		body.searchString = searchStringForReplaceWithImage;

		const replaceImage = this.getNodeParameter('replaceImage', index) as string;
		body.replaceImage = replaceImage;
	}

	const pages = this.getNodeParameter('pages', index) as string;
	if (pages) {
		body.pages = pages;
	}

	// Add advanced options
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	const replacementLimit = advancedOptions.replacementLimit as number | undefined;
	if (replacementLimit !== undefined) {
		body.replacementLimit = replacementLimit;
	}

	const regexSearch = advancedOptions.regexSearch as boolean | undefined;
	if (regexSearch !== undefined) {
		body.regex = regexSearch;
	}

	const caseSensitive = advancedOptions.caseSensitive as boolean | undefined;
	if (caseSensitive !== undefined) {
		body.caseSensitive = caseSensitive;
	}

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

	const password = advancedOptions?.password as string | undefined;
	if (password) body.password = password;

	const profiles = advancedOptions?.profiles as string | undefined;
	if (profiles) body.profiles = profiles;

	sanitizeProfiles(body);

	// Choose endpoint based on operation type
	let endpoint = '/v1/pdf/edit/';
	switch (operationType) {
		case 'delete':
			endpoint += 'delete-text';
			break;
		case 'replace':
			endpoint += 'replace-text';
			break;
		case 'replaceWithImage':
			endpoint += 'replace-text-with-image';
			break;
	}

	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
