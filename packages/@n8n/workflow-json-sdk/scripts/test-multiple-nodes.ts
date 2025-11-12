import { convertNodeToTypes, type NodeTypeDefinition } from './generateTypes';

// Multiple node definitions to demonstrate the mapping
const nodeDefinitions: NodeTypeDefinition[] = [
	{
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		properties: [
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
					{ name: 'DELETE', value: 'DELETE' },
				],
				default: 'GET',
				description: 'The HTTP method to use',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL to make the request to',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'header',
						value: 'header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Header name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Header value',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Gmail',
		name: 'n8n-nodes-base.gmail',
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Message', value: 'message' },
				],
				default: 'message',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: { resource: ['message'] },
				},
				options: [
					{ name: 'Send', value: 'send' },
					{ name: 'Get', value: 'get' },
				],
				default: 'send',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['send'],
					},
				},
				default: '',
				description: 'Email address of the recipient',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['send'],
					},
				},
				default: '',
				description: 'Subject of the email',
			},
		],
	},
	{
		displayName: 'Set',
		name: 'n8n-nodes-base.set',
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Manual', value: 'manual' },
					{ name: 'JSON', value: 'json' },
				],
				default: 'manual',
				description: 'How to set the data',
			},
			{
				displayName: 'Values',
				name: 'values',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: { mode: ['manual'] },
				},
				options: [
					{
						name: 'value',
						value: 'value',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the field to set',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set',
							},
						],
					},
				],
			},
			{
				displayName: 'JSON',
				name: 'jsonData',
				type: 'json',
				displayOptions: {
					show: { mode: ['json'] },
				},
				default: '{}',
				description: 'JSON data to set',
			},
		],
	},
];

// Generate types
const generatedTypes = convertNodeToTypes(nodeDefinitions);

console.log('='.repeat(80));
console.log('GENERATED TYPES FOR MULTIPLE NODES');
console.log('='.repeat(80));
console.log(generatedTypes);
console.log('='.repeat(80));
console.log('\nUSAGE EXAMPLE:');
console.log('='.repeat(80));
console.log(`
// The NodeTypeToParametersMap allows type-safe access to node parameters:

type HttpParams = NodeTypeToParametersMap['n8n-nodes-base.httpRequest'];
type GmailParams = NodeTypeToParametersMap['n8n-nodes-base.gmail'];
type SetParams = NodeTypeToParametersMap['n8n-nodes-base.set'];

// Example: Type-safe node parameter function
function getNodeParameters<T extends keyof NodeTypeToParametersMap>(
  nodeType: T
): NodeTypeToParametersMap[T] {
  // Your implementation here
  return {} as NodeTypeToParametersMap[T];
}

// Usage with full type safety:
const httpParams = getNodeParameters('n8n-nodes-base.httpRequest');
// httpParams.method is typed as "GET" | "POST" | "PUT" | "DELETE" | undefined
// httpParams.url is typed as string

const gmailParams = getNodeParameters('n8n-nodes-base.gmail');
// gmailParams.resource is typed as "draft" | "message" | undefined
// gmailParams.to is typed as string (with conditional display logic)

// TypeScript will error on invalid node types:
// const invalid = getNodeParameters('n8n-nodes-base.nonExistent');
//                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                                   Error: Type not in mapping!
`);
console.log('='.repeat(80));
