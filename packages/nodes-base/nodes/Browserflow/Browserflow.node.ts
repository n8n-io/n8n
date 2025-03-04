import { INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

export class Browserflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browserflow for LinkedIn',
		name: 'browserflow',
		icon: 'file:browserflow.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Automate LinkedIn with Browserflow',
		defaults: {
			name: 'Browserflow',
		},
		inputs: ['main'] as NodeConnectionType[], // Type assertion to satisfy the linter
		outputs: ['main'] as NodeConnectionType[], // Type assertion to satisfy the linter
		credentials: [
			{
				name: 'browserflowApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://app.browserflow.io/api/',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '',
						value: 'linkedin',
					},
				],
				default: 'linkedin',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Check if a Person Is a Connection',
						value: 'checkConnection',
						action: 'Check if a person is a connection',
					},
					{
						name: 'Export LinkedIn Chat History',
						value: 'getChatHistory',
						action: 'Export linked in chat history',
					},
					{
						name: 'Get Data From A Linkedin Profile',
						value: 'getProfileData',
						action: 'Get data from a linkedin profile',
					},
					{
						name: 'Scrape Profiles From A LinkedIn Post',
						value: 'scrapeProfilesFromPostComments',
						action: 'Scrape profiles from a linked in post',
					},
					{
						name: 'Scrape Profiles From A LinkedIn Search',
						value: 'scrapeProfilesFromSearch',
						action: 'Scrape profiles from a linked in search',
					},
					{
						name: 'Send A LinkedIn Connection Invite',
						value: 'sendConnectionInvite',
						action: 'Send a linked in connection invite',
					},
					{
						name: 'Send A LinkedIn Message',
						value: 'sendMessage',
						action: 'Send a linked in message',
					},
				],
				default: 'checkConnection',
				displayOptions: {
					show: {
						resource: ['linkedin'],
					},
				},
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The LinkedIn profile URL to check connection status',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['checkConnection'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-check-connection-status',
						body: {
							linkedinUrl: '={{$value}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The LinkedIn profile URL to get profile data',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['getProfileData'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-profile-data',
						body: {
							linkedinUrl: '={{$value}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The LinkedIn profile URL to send a connection invite',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['sendConnectionInvite'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-connection-invite',
						body: {
							linkedinUrl: '={{$value}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'Add Message',
				name: 'addMessage',
				type: 'boolean',
				default: false,
				description: 'Whether to include a custom message in the connection invite',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['sendConnectionInvite'],
					},
				},
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description:
					"Optional message to include in the connection invite. When left blank, the connection invite is sent without a message, avoiding LinkedIn limits. If you provide a message, ensure it fits within LinkedIn's character and message limits.",
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['sendConnectionInvite'],
						addMessage: [true],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-connection-invite',
						body: {
							linkedinUrl: '={{$parameter["linkedinUrl"]}}',
							message: '={{$value}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The LinkedIn profile URL to get chat history',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['getChatHistory'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-get-chat-history',
						body: {
							linkedinUrl: '={{$value}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{
						name: 'Persons',
						value: 'persons',
					},
					{
						name: 'Companies',
						value: 'companies',
					},
				],
				default: 'persons',
				description: 'The category to scrape: persons or companies',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromSearch'],
					},
				},
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				required: true,
				description: 'The search term to use for scraping profiles',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromSearch'],
					},
				},
			},
			{
				displayName: 'Start Page',
				name: 'startPage',
				type: 'number',
				default: 1,
				description: 'The starting page to scrape (can be used for pagination)',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromSearch'],
					},
				},
			},
			{
				displayName: 'Number of Pages',
				name: 'nrOfPages',
				type: 'number',
				default: 1,
				description: 'The number of pages to scrape',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromSearch'],
					},
				},
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'The city to filter the search results by',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromSearch'],
					},
				},
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'The country to filter the search results by',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromSearch'],
					},
				},
			},
			{
				displayName: 'Scrape Profiles From Search',
				name: 'scrapeProfilesFromSearch',
				type: 'hidden',
				default: {},
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromSearch'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-scrape-profiles-from-search',
						body: {
							category: '={{$parameter["category"]}}',
							searchTerm: '={{$parameter["searchTerm"]}}',
							startPage: '={{$parameter["startPage"]}}',
							nrOfPages: '={{$parameter["nrOfPages"]}}',
							city: '={{$parameter["city"]}}',
							country: '={{$parameter["country"]}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'Post URL',
				name: 'postUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL of the LinkedIn post to scrape profiles from',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
					},
				},
			},
			{
				displayName: 'Add Comments',
				name: 'addComments',
				type: 'boolean',
				default: false,
				description: 'Whether to include comments in the scrape results',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
					},
				},
			},
			{
				displayName: 'Comments Offset',
				name: 'commentsOffset',
				type: 'number',
				default: 0,
				description: 'The number of comments to skip before starting to scrape',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
						addComments: [true],
					},
				},
			},
			{
				displayName: 'Comments Limit',
				name: 'commentsLimit',
				type: 'number',
				default: 10,
				description: 'The maximum number of comments to scrape',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
						addComments: [true],
					},
				},
			},
			{
				displayName: 'Add Reactions',
				name: 'addReactions',
				type: 'boolean',
				default: false,
				description: 'Whether to include reactions in the scrape results',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
					},
				},
			},
			{
				displayName: 'Reactions Offset',
				name: 'reactionsOffset',
				type: 'number',
				default: 0,
				description: 'The number of reactions to skip before starting to scrape',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
						addReactions: [true],
					},
				},
			},
			{
				displayName: 'Reactions Limit',
				name: 'reactionsLimit',
				type: 'number',
				default: 10,
				description: 'The maximum number of reactions to scrape',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
						addReactions: [true],
					},
				},
			},
			{
				displayName: 'Scrape Profiles From Post Comments',
				name: 'scrapeProfilesFromPostComments',
				type: 'hidden',
				default: {},
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['scrapeProfilesFromPostComments'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-scrape-profiles-from-post-comments',
						body: {
							postUrl: '={{$parameter["postUrl"]}}',
							add_comments: '={{$parameter["addComments"]}}',
							comments_offset: '={{$parameter["commentsOffset"]}}',
							comments_limit: '={{$parameter["commentsLimit"]}}',
							add_reactions: '={{$parameter["addReactions"]}}',
							reactions_offset: '={{$parameter["reactionsOffset"]}}',
							reactions_limit: '={{$parameter["reactionsLimit"]}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The LinkedIn profile URL to send a message',
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['sendMessage'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-send-message',
						body: {
							linkedinUrl: '={{$value}}',
						},
						json: true,
					},
				},
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				description:
					"The message to send. Ensure it fits within LinkedIn's character and message limits.",
				displayOptions: {
					show: {
						resource: ['linkedin'],
						operation: ['sendMessage'],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/linkedin-send-message',
						body: {
							linkedinUrl: '={{$parameter["linkedinUrl"]}}',
							message: '={{$value}}',
						},
						json: true,
					},
				},
			},
		],
	};
}
