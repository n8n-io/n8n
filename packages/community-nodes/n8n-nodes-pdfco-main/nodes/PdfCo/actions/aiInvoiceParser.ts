import type { INodeProperties } from 'n8n-workflow';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { pdfcoApiRequestWithJobCheck, ActionConstants } from '../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Url',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/invoice.pdf',
		description: 'The URL of the invoice to parse',
		//hint: `Enter your file link. See our guide at https://developer.pdf.co/integrations/zapier/input-file-sources/index.html for details.`,
		displayOptions: {
			show: {
				operation: [ActionConstants.AiInvoiceParser],
			},
		}
	},
	{
		displayName: 'Advanced Options',
		name: 'advancedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [ActionConstants.AiInvoiceParser],
			},
		},
		options: [
			{
				displayName: 'Webhook URL',
				name: 'callback',
				type: 'string', // You can also use "url" if you want built-in URL validation.
				default: '',
				description: 'The callback URL or Webhook used to receive the output data',
				placeholder: 'https://example.com/callback',
				//hint: 'The callback URL or Webhook used to receive the output data.',
			},
		],
	}
];


export async function execute(this: IExecuteFunctions, index: number) {
	// Retrieve the "url" parameter.
	const inputUrl = this.getNodeParameter('url', index) as string;

	// Retrieve advanced options (returns an empty object if not provided)
	const advancedOptions = this.getNodeParameter('advancedOptions', index) as IDataObject;

	// Retrieve optional values from advanced options using optional chaining
	const callback = advancedOptions?.callback as string | undefined;

	// Endpoint
	const endpoint = `/v1/ai-invoice-parser`;

	// Build the payload object; add fileName and profiles only if provided
	const body: IDataObject = { url: inputUrl, async: true };
	if (callback) body.callback = callback;

	// Make the API request and return the response in the expected format
	const responseData = await pdfcoApiRequestWithJobCheck.call(this, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
