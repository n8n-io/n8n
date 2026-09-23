import type {
	CustomNodeAuth,
	CustomNodeDefinition,
	CustomOperationDefinition,
	CustomOperationVersionContent,
} from '@n8n/api-types';

/**
 * Demo data for the mockup: three custom actions on built-in nodes (Stripe,
 * GitHub, Slack) and three custom nodes (Acme Billing, Open-Meteo Weather,
 * Feature Flags). Seeded when the table is empty and re-seeded when a seed id
 * of the current set is missing, so upgrading the demo data only needs a
 * restart. All seed ids start with `seed`.
 */

export const SEED_ID_PREFIX = 'seed';

const now = () => new Date().toISOString();

const svgDataUri = (svg: string) =>
	`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const ACME_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1F2A44"/>
  <path d="M18 44 32 18l14 26h-7.2l-6.8-13.4L25.2 44z" fill="#FF6D5A"/>
  <rect x="22" y="47" width="20" height="4" rx="2" fill="#FFFFFF"/>
</svg>`;

const WEATHER_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1E88E5"/>
  <circle cx="24" cy="26" r="9" fill="#FFD54F"/>
  <path d="M20 46h26a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-5 18z" fill="#FFFFFF"/>
</svg>`;

const FLAGS_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2E7D32"/>
  <rect x="18" y="14" width="4" height="36" rx="2" fill="#FFFFFF"/>
  <path d="M22 16h24l-6 9 6 9H22z" fill="#A5D6A7"/>
</svg>`;

function version(
	content: Omit<CustomOperationVersionContent, 'changelog'>,
	changelog = 'Initial version',
): CustomOperationDefinition['versions'][number] {
	return { version: 1, createdAt: now(), changelog, ...content };
}

// ---------------------------------------------------------------- actions

export function seedStripePaymentLink(): CustomOperationDefinition {
	return {
		id: 'seedStripePaymentLink',
		name: 'Create Payment Link',
		description: 'Create a Stripe Payment Link for a single price',
		parentNodeType: 'n8n-nodes-base.stripe',
		customNodeId: null,
		activeVersion: 1,
		versions: [
			version({
				request: {
					method: 'POST',
					url: 'https://api.stripe.com/v1/payment_links',
					headers: {},
					query: {},
					bodyType: 'form',
					auth: { kind: 'predefined', credentialType: 'stripeApi' },
				},
				fixedData: [
					{ target: 'body', key: 'line_items[0].adjustable_quantity.enabled', value: 'false' },
				],
				inputs: [
					{
						name: 'price',
						displayName: 'Price ID',
						description: 'ID of the Stripe Price to sell, e.g. price_1Nx...',
						type: 'string',
						required: true,
						default: '',
						target: 'body',
						key: 'line_items[0].price',
					},
					{
						name: 'quantity',
						displayName: 'Quantity',
						type: 'number',
						required: true,
						default: 1,
						target: 'body',
						key: 'line_items[0].quantity',
					},
					{
						name: 'afterCompletionType',
						displayName: 'After Completion',
						type: 'options',
						options: [
							{ name: 'Hosted Confirmation', value: 'hosted_confirmation' },
							{ name: 'Redirect', value: 'redirect' },
						],
						required: false,
						default: 'hosted_confirmation',
						target: 'body',
						key: 'after_completion.type',
					},
					{
						name: 'redirectUrl',
						displayName: 'Redirect URL',
						type: 'string',
						required: false,
						default: '',
						target: 'body',
						key: 'after_completion.redirect.url',
					},
					{
						name: 'allowPromotionCodes',
						displayName: 'Allow Promotion Codes',
						type: 'boolean',
						required: false,
						default: false,
						target: 'body',
						key: 'allow_promotion_codes',
					},
				],
			}),
		],
	};
}

export function seedGithubReaction(): CustomOperationDefinition {
	return {
		id: 'seedGithubIssueReaction',
		name: 'React to Issue',
		description: 'Add an emoji reaction to an issue or pull request',
		parentNodeType: 'n8n-nodes-base.github',
		customNodeId: null,
		activeVersion: 1,
		versions: [
			version({
				request: {
					method: 'POST',
					url: 'https://api.github.com/repos/{{ $parameter.owner }}/{{ $parameter.repository }}/issues/{{ $parameter.issueNumber }}/reactions',
					headers: { Accept: 'application/vnd.github+json' },
					query: {},
					bodyType: 'json',
					auth: { kind: 'predefined', credentialType: 'githubApi' },
				},
				fixedData: [{ target: 'header', key: 'X-GitHub-Api-Version', value: '2022-11-28' }],
				inputs: [
					{
						name: 'owner',
						displayName: 'Repository Owner',
						type: 'string',
						required: true,
						default: '',
						target: 'url',
						key: 'owner',
					},
					{
						name: 'repository',
						displayName: 'Repository Name',
						type: 'string',
						required: true,
						default: '',
						target: 'url',
						key: 'repository',
					},
					{
						name: 'issueNumber',
						displayName: 'Issue Number',
						type: 'number',
						required: true,
						default: 1,
						target: 'url',
						key: 'issueNumber',
					},
					{
						name: 'content',
						displayName: 'Reaction',
						type: 'options',
						options: [
							{ name: '👍 +1', value: '+1' },
							{ name: '👎 -1', value: '-1' },
							{ name: '😄 Laugh', value: 'laugh' },
							{ name: '🎉 Hooray', value: 'hooray' },
							{ name: '😕 Confused', value: 'confused' },
							{ name: '❤️ Heart', value: 'heart' },
							{ name: '🚀 Rocket', value: 'rocket' },
							{ name: '👀 Eyes', value: 'eyes' },
						],
						required: true,
						default: 'rocket',
						target: 'body',
						key: 'content',
					},
				],
			}),
		],
	};
}

export function seedSlackStatus(): CustomOperationDefinition {
	return {
		id: 'seedSlackSetStatus',
		name: 'Set User Status',
		description: 'Set the status text and emoji of the authenticated user',
		parentNodeType: 'n8n-nodes-base.slack',
		customNodeId: null,
		activeVersion: 1,
		versions: [
			version({
				request: {
					method: 'POST',
					url: 'https://slack.com/api/users.profile.set',
					headers: {},
					query: {},
					bodyType: 'json',
					auth: { kind: 'predefined', credentialType: 'slackApi' },
				},
				fixedData: [],
				inputs: [
					{
						name: 'statusText',
						displayName: 'Status Text',
						type: 'string',
						required: true,
						default: 'In a workflow',
						target: 'body',
						key: 'profile.status_text',
					},
					{
						name: 'statusEmoji',
						displayName: 'Status Emoji',
						description: 'Slack emoji code, e.g. :robot_face:',
						type: 'string',
						required: false,
						default: ':robot_face:',
						target: 'body',
						key: 'profile.status_emoji',
					},
					{
						name: 'statusExpiration',
						displayName: 'Expires At (Unix Timestamp)',
						description: '0 means the status does not expire',
						type: 'number',
						required: false,
						default: 0,
						target: 'body',
						key: 'profile.status_expiration',
					},
				],
			}),
		],
	};
}

// ------------------------------------------------------------ custom nodes

interface SeedNode {
	node: CustomNodeDefinition;
	operations: CustomOperationDefinition[];
}

function seedAcmeBilling(): SeedNode {
	const nodeId = 'seedAcmeBilling';
	const auth: CustomNodeAuth = { kind: 'generic', type: 'httpHeaderAuth' };
	const operations: CustomOperationDefinition[] = [
		{
			id: 'seedAcmeCreateInvoice',
			name: 'Create Invoice',
			description: 'Create a draft invoice for a customer',
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [
				version({
					request: {
						method: 'POST',
						url: '/invoices',
						headers: {},
						query: {},
						bodyType: 'json',
						body: '{ "source": "n8n" }',
						auth,
					},
					fixedData: [],
					inputs: [
						{
							name: 'customerId',
							displayName: 'Customer ID',
							type: 'string',
							required: true,
							default: '',
							target: 'body',
							key: 'customer_id',
						},
						{
							name: 'amount',
							displayName: 'Amount (cents)',
							type: 'number',
							required: true,
							default: 0,
							target: 'body',
							key: 'amount',
						},
						{
							name: 'currency',
							displayName: 'Currency',
							type: 'options',
							options: [
								{ name: 'EUR', value: 'eur' },
								{ name: 'USD', value: 'usd' },
							],
							required: false,
							default: 'eur',
							target: 'body',
							key: 'currency',
						},
						{
							name: 'memo',
							displayName: 'Memo',
							type: 'string',
							required: false,
							default: '',
							target: 'body',
							key: 'memo',
						},
					],
				}),
			],
		},
		{
			id: 'seedAcmeGetInvoice',
			name: 'Get Invoice',
			description: 'Fetch one invoice by ID',
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [
				version({
					request: {
						method: 'GET',
						url: '/invoices/{{ $parameter.invoiceId }}',
						headers: {},
						query: {},
						bodyType: 'none',
						auth,
					},
					fixedData: [{ target: 'query', key: 'expand', value: 'customer' }],
					inputs: [
						{
							name: 'invoiceId',
							displayName: 'Invoice ID',
							type: 'string',
							required: true,
							default: '',
							target: 'url',
							key: 'invoiceId',
						},
						{
							name: 'includeLines',
							displayName: 'Include Line Items',
							type: 'boolean',
							required: false,
							default: false,
							target: 'query',
							key: 'include_lines',
						},
					],
				}),
			],
		},
	];
	return {
		node: {
			id: nodeId,
			name: 'acmeBilling',
			displayName: 'Acme Billing',
			description: 'Custom node for the (fictional) Acme Billing API',
			iconDataUri: svgDataUri(ACME_LOGO),
			baseUrl: 'https://billing.acme.example/api/v2',
			auth,
			operationIds: operations.map((op) => op.id),
		},
		operations,
	};
}

/** Real public API without authentication, so it runs live in a demo. */
function seedOpenMeteo(): SeedNode {
	const nodeId = 'seedOpenMeteo';
	const auth: CustomNodeAuth = { kind: 'none' };
	const operations: CustomOperationDefinition[] = [
		{
			id: 'seedOpenMeteoCurrent',
			name: 'Get Current Weather',
			description: 'Current temperature and wind for a coordinate',
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [
				version({
					request: {
						method: 'GET',
						url: '/v1/forecast',
						headers: {},
						query: {},
						bodyType: 'none',
						auth,
					},
					fixedData: [
						{
							target: 'query',
							key: 'current',
							value: 'temperature_2m,wind_speed_10m,weather_code',
						},
						{ target: 'query', key: 'timezone', value: 'auto' },
					],
					inputs: [
						{
							name: 'latitude',
							displayName: 'Latitude',
							type: 'number',
							required: true,
							default: 52.52,
							target: 'query',
							key: 'latitude',
						},
						{
							name: 'longitude',
							displayName: 'Longitude',
							type: 'number',
							required: true,
							default: 13.41,
							target: 'query',
							key: 'longitude',
						},
						{
							name: 'temperatureUnit',
							displayName: 'Temperature Unit',
							type: 'options',
							options: [
								{ name: 'Celsius', value: 'celsius' },
								{ name: 'Fahrenheit', value: 'fahrenheit' },
							],
							required: false,
							default: 'celsius',
							target: 'query',
							key: 'temperature_unit',
						},
					],
				}),
			],
		},
		{
			id: 'seedOpenMeteoGeocode',
			name: 'Search City',
			description: 'Look up coordinates for a city name',
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [
				version({
					request: {
						method: 'GET',
						url: 'https://geocoding-api.open-meteo.com/v1/search',
						headers: {},
						query: {},
						bodyType: 'none',
						auth,
					},
					fixedData: [{ target: 'query', key: 'format', value: 'json' }],
					inputs: [
						{
							name: 'name',
							displayName: 'City',
							type: 'string',
							required: true,
							default: 'Berlin',
							target: 'query',
							key: 'name',
						},
						{
							name: 'count',
							displayName: 'Max Results',
							type: 'number',
							required: false,
							default: 5,
							target: 'query',
							key: 'count',
						},
						{
							name: 'language',
							displayName: 'Language',
							type: 'string',
							required: false,
							default: 'en',
							target: 'query',
							key: 'language',
						},
					],
				}),
			],
		},
	];
	return {
		node: {
			id: nodeId,
			name: 'openMeteoWeather',
			displayName: 'Open-Meteo Weather',
			description: 'Free weather and geocoding API, no API key needed',
			iconDataUri: svgDataUri(WEATHER_LOGO),
			baseUrl: 'https://api.open-meteo.com',
			auth,
			operationIds: operations.map((op) => op.id),
		},
		operations,
	};
}

function seedFeatureFlags(): SeedNode {
	const nodeId = 'seedFeatureFlags';
	const auth: CustomNodeAuth = { kind: 'generic', type: 'httpBearerAuth' };
	const operations: CustomOperationDefinition[] = [
		{
			id: 'seedFlagsList',
			name: 'List Flags',
			description: 'List all feature flags of an environment',
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [
				version({
					request: {
						method: 'GET',
						url: '/environments/{{ $parameter.environment }}/flags',
						headers: {},
						query: {},
						bodyType: 'none',
						auth,
					},
					fixedData: [],
					inputs: [
						{
							name: 'environment',
							displayName: 'Environment',
							type: 'options',
							options: [
								{ name: 'Production', value: 'production' },
								{ name: 'Staging', value: 'staging' },
							],
							required: true,
							default: 'staging',
							target: 'url',
							key: 'environment',
						},
						{
							name: 'onlyEnabled',
							displayName: 'Only Enabled',
							type: 'boolean',
							required: false,
							default: false,
							target: 'query',
							key: 'enabled',
						},
					],
				}),
			],
		},
		{
			id: 'seedFlagsGet',
			name: 'Get Flag',
			description: 'Read one feature flag',
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [
				version({
					request: {
						method: 'GET',
						url: '/environments/{{ $parameter.environment }}/flags/{{ $parameter.flagKey }}',
						headers: {},
						query: {},
						bodyType: 'none',
						auth,
					},
					fixedData: [],
					inputs: [
						{
							name: 'environment',
							displayName: 'Environment',
							type: 'options',
							options: [
								{ name: 'Production', value: 'production' },
								{ name: 'Staging', value: 'staging' },
							],
							required: true,
							default: 'staging',
							target: 'url',
							key: 'environment',
						},
						{
							name: 'flagKey',
							displayName: 'Flag Key',
							type: 'string',
							required: true,
							default: '',
							target: 'url',
							key: 'flagKey',
						},
					],
				}),
			],
		},
		{
			id: 'seedFlagsToggle',
			name: 'Toggle Flag',
			description: 'Enable or disable a feature flag',
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [
				version({
					request: {
						method: 'PATCH',
						url: '/environments/{{ $parameter.environment }}/flags/{{ $parameter.flagKey }}',
						headers: {},
						query: {},
						bodyType: 'json',
						auth,
					},
					fixedData: [{ target: 'body', key: 'changed_by', value: 'n8n' }],
					inputs: [
						{
							name: 'environment',
							displayName: 'Environment',
							type: 'options',
							options: [
								{ name: 'Production', value: 'production' },
								{ name: 'Staging', value: 'staging' },
							],
							required: true,
							default: 'staging',
							target: 'url',
							key: 'environment',
						},
						{
							name: 'flagKey',
							displayName: 'Flag Key',
							type: 'string',
							required: true,
							default: '',
							target: 'url',
							key: 'flagKey',
						},
						{
							name: 'enabled',
							displayName: 'Enabled',
							type: 'boolean',
							required: true,
							default: true,
							target: 'body',
							key: 'enabled',
						},
						{
							name: 'reason',
							displayName: 'Reason',
							type: 'string',
							required: false,
							default: '',
							target: 'body',
							key: 'reason',
						},
					],
				}),
			],
		},
	];
	return {
		node: {
			id: nodeId,
			name: 'featureFlags',
			displayName: 'Feature Flags',
			description: 'Custom node for an internal (fictional) feature flag service',
			iconDataUri: svgDataUri(FLAGS_LOGO),
			baseUrl: 'https://flags.internal.example/api',
			auth,
			operationIds: operations.map((op) => op.id),
		},
		operations,
	};
}

// ------------------------------------------------------------------ export

export interface SeedSet {
	actions: CustomOperationDefinition[];
	nodes: SeedNode[];
}

export function seedSet(): SeedSet {
	return {
		actions: [seedStripePaymentLink(), seedGithubReaction(), seedSlackStatus()],
		nodes: [seedAcmeBilling(), seedOpenMeteo(), seedFeatureFlags()],
	};
}

/** Every id the current seed set writes; used to detect an outdated seed. */
export function seedIds(): string[] {
	const set = seedSet();
	return [
		...set.actions.map((a) => a.id),
		...set.nodes.flatMap((n) => [n.node.id, ...n.operations.map((op) => op.id)]),
	];
}
