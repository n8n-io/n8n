import type { Tenant } from '@n8n/ai-gym';
import type { SimulationSeedSchema, SimulationVendorCapabilities } from './types';

/**
 * Declarative seed schema registry for ai-gym vendors.
 *
 * Each vendor describes:
 * - `settings`: top-level scalar configuration passed to `tenant.seed(vendor, payload)`
 * - `collections`: repeatable entity tables (e.g. channels, issues, repositories, emails).
 *   Each collection specifies whether it is applied via the vendor's native `seed()` hook
 *   or hydrated by calling the vendor's own simulated API (`api-action`) inside `tenant.run`.
 *
 * The frontend renders every service from this descriptor dynamically — no per-service
 * UI components are needed.
 */
const VENDOR_SEED_SCHEMAS: Record<string, SimulationSeedSchema> = {
	slack: {
		description:
			'Seed Slack workspace settings, channels, users, and messages before the workflow runs.',
		settings: [
			{
				key: 'workspace.name',
				label: 'Workspace name',
				type: 'string',
				defaultValue: 'Acme Corp',
				placeholder: 'Acme Corp',
			},
		],
		collections: [
			{
				key: 'channels',
				label: 'Channels',
				singularLabel: 'Channel',
				description: 'Channels available to Slack list/join/history/post operations.',
				applyMode: 'seed-each',
				seedWrapKey: 'channel',
				fields: [
					{
						key: 'id',
						label: 'Channel ID',
						type: 'string',
						required: true,
						placeholder: 'C01ALERTS01',
					},
					{ key: 'name', label: 'Name', type: 'string', required: true, placeholder: 'alerts' },
					{ key: 'topic', label: 'Topic', type: 'string', placeholder: 'Production alerts' },
					{ key: 'is_private', label: 'Private', type: 'boolean', defaultValue: false },
				],
			},
			{
				key: 'users',
				label: 'Users',
				singularLabel: 'User',
				description: 'Workspace members returned by users.list and referenced by messages.',
				applyMode: 'seed-each',
				seedWrapKey: 'user',
				fields: [
					{
						key: 'id',
						label: 'User ID',
						type: 'string',
						required: true,
						placeholder: 'U01ALICE001',
					},
					{ key: 'name', label: 'Handle', type: 'string', required: true, placeholder: 'alice' },
					{ key: 'real_name', label: 'Real name', type: 'string', placeholder: 'Alice Chen' },
					{ key: 'email', label: 'Email', type: 'string', placeholder: 'alice@acme.test' },
				],
			},
			{
				key: 'messages',
				label: 'Messages',
				singularLabel: 'Message',
				description: 'Historical messages pre-populated into a channel before the run.',
				applyMode: 'seed-each',
				seedWrapKey: 'message',
				fields: [
					{
						key: 'channel',
						label: 'Channel ID',
						type: 'string',
						required: true,
						placeholder: 'C01ALERTS01',
					},
					{ key: 'user', label: 'User ID', type: 'string', placeholder: 'U01ALICE001' },
					{ key: 'ts', label: 'Timestamp', type: 'string', placeholder: '1700000001.000100' },
					{
						key: 'text',
						label: 'Text',
						type: 'text',
						required: true,
						placeholder: '[SEV1] Checkout API 5xx spike',
					},
				],
			},
		],
	},
	github: {
		description: 'Seed GitHub repositories and pre-existing issues before the workflow runs.',
		settings: [],
		collections: [
			{
				key: 'repositories',
				label: 'Repositories',
				singularLabel: 'Repository',
				description: 'Repositories available in the simulated GitHub org.',
				applyMode: 'seed-array',
				seedArrayKey: 'repositories',
				fields: [
					{
						key: 'owner',
						label: 'Owner',
						type: 'string',
						required: true,
						defaultValue: 'acme',
						placeholder: 'acme',
					},
					{
						key: 'name',
						label: 'Repository',
						type: 'string',
						required: true,
						placeholder: 'checkout-service',
					},
				],
			},
			{
				key: 'issues',
				label: 'Issues',
				singularLabel: 'Issue',
				description:
					'Pre-existing GitHub issues created via the simulated GitHub API before execution.',
				applyMode: 'api-action',
				actionId: 'github.createIssue',
				fields: [
					{
						key: 'owner',
						label: 'Owner',
						type: 'string',
						required: true,
						defaultValue: 'acme',
						placeholder: 'acme',
					},
					{
						key: 'repo',
						label: 'Repository',
						type: 'string',
						required: true,
						placeholder: 'checkout-service',
					},
					{
						key: 'title',
						label: 'Title',
						type: 'string',
						required: true,
						placeholder: 'Elevated 5xx errors in checkout',
					},
					{ key: 'body', label: 'Body', type: 'text', placeholder: 'Detailed description...' },
				],
			},
		],
	},
	linear: {
		description: 'Seed Linear workspace, team, and pre-existing tickets before the workflow runs.',
		settings: [
			{
				key: 'workspace_name',
				label: 'Workspace name',
				type: 'string',
				defaultValue: 'Acme Engineering',
				placeholder: 'Acme Engineering',
			},
			{
				key: 'url_key',
				label: 'URL key',
				type: 'string',
				defaultValue: 'acme',
				placeholder: 'acme',
			},
			{
				key: 'team_key',
				label: 'Team key',
				type: 'string',
				defaultValue: 'ENG',
				placeholder: 'ENG',
			},
			{
				key: 'team_name',
				label: 'Team name',
				type: 'string',
				defaultValue: 'Engineering',
				placeholder: 'Engineering',
			},
		],
		collections: [
			{
				key: 'issues',
				label: 'Issues / Tickets',
				singularLabel: 'Ticket',
				description: 'Pre-existing Linear issues seeded into the team before the workflow runs.',
				applyMode: 'api-action',
				actionId: 'linear.createIssue',
				fields: [
					{
						key: 'title',
						label: 'Title',
						type: 'string',
						required: true,
						placeholder: 'Investigate checkout latency',
					},
					{
						key: 'description',
						label: 'Description',
						type: 'text',
						placeholder: 'Impact and reproduction notes...',
					},
					{
						key: 'priority',
						label: 'Priority',
						type: 'select',
						defaultValue: '2',
						options: [
							{ value: '0', label: 'No priority (0)' },
							{ value: '1', label: 'Urgent (1)' },
							{ value: '2', label: 'High (2)' },
							{ value: '3', label: 'Medium (3)' },
							{ value: '4', label: 'Low (4)' },
						],
					},
				],
			},
		],
	},
	gmail: {
		description: 'Seed Gmail domain and pre-existing inbox/sent messages before the workflow runs.',
		settings: [
			{
				key: 'domain',
				label: 'Mail domain',
				type: 'string',
				defaultValue: 'acme.test',
				placeholder: 'acme.test',
			},
		],
		collections: [
			{
				key: 'messages',
				label: 'Messages',
				singularLabel: 'Email',
				description: 'Pre-existing emails placed in the mailbox before the workflow runs.',
				applyMode: 'api-action',
				actionId: 'gmail.deliverMessage',
				fields: [
					{
						key: 'to',
						label: 'To',
						type: 'string',
						required: true,
						placeholder: 'oncall@acme.test',
					},
					{
						key: 'subject',
						label: 'Subject',
						type: 'string',
						required: true,
						placeholder: 'Incident alert: Checkout API',
					},
					{
						key: 'body',
						label: 'Body',
						type: 'text',
						required: true,
						placeholder: 'Plain-text email body...',
					},
				],
			},
		],
	},
	jira: {
		description: 'Seed Jira projects and issues before the workflow runs.',
		settings: [],
		collections: [
			{
				key: 'projects',
				label: 'Projects',
				singularLabel: 'Project',
				applyMode: 'seed-array',
				seedArrayKey: 'projects',
				fields: [
					{ key: 'key', label: 'Project key', type: 'string', required: true, placeholder: 'OPS' },
					{ key: 'name', label: 'Name', type: 'string', required: true, placeholder: 'Operations' },
					{
						key: 'description',
						label: 'Description',
						type: 'string',
						placeholder: 'Incident tracking',
					},
				],
			},
			{
				key: 'issues',
				label: 'Issues',
				singularLabel: 'Issue',
				applyMode: 'seed-array',
				seedArrayKey: 'issues',
				fields: [
					{ key: 'key', label: 'Issue key', type: 'string', required: true, placeholder: 'OPS-1' },
					{
						key: 'summary',
						label: 'Summary',
						type: 'string',
						required: true,
						placeholder: 'Database failover test',
					},
				],
			},
		],
	},
	notion: {
		description: 'Seed Notion workspace settings, members, databases, and pages.',
		settings: [
			{
				key: 'workspace_name',
				label: 'Workspace name',
				type: 'string',
				defaultValue: 'Acme Wiki',
				placeholder: 'Acme Wiki',
			},
		],
		collections: [
			{
				key: 'members',
				label: 'Members',
				singularLabel: 'Member',
				applyMode: 'seed-array',
				seedArrayKey: 'members',
				fields: [
					{ key: 'name', label: 'Name', type: 'string', required: true, placeholder: 'Alice Chen' },
					{ key: 'email', label: 'Email', type: 'string', placeholder: 'alice@acme.test' },
				],
			},
			{
				key: 'pages',
				label: 'Pages',
				singularLabel: 'Page',
				applyMode: 'seed-array',
				seedArrayKey: 'pages',
				fields: [
					{
						key: 'title',
						label: 'Title',
						type: 'string',
						required: true,
						placeholder: 'Incident Runbook',
					},
					{
						key: 'content',
						label: 'Content',
						type: 'text',
						placeholder: 'Step-by-step response guide...',
					},
				],
			},
		],
	},
	hubspot: {
		description: 'Seed HubSpot CRM contacts and deals.',
		settings: [],
		collections: [
			{
				key: 'contacts',
				label: 'Contacts',
				singularLabel: 'Contact',
				applyMode: 'seed-nested-array',
				seedNestedPath: ['objects', 'contacts'],
				fields: [
					{
						key: 'email',
						label: 'Email',
						type: 'string',
						required: true,
						placeholder: 'jane@customer.test',
					},
					{ key: 'firstname', label: 'First name', type: 'string', placeholder: 'Jane' },
					{ key: 'lastname', label: 'Last name', type: 'string', placeholder: 'Doe' },
				],
			},
		],
	},
	zendesk: {
		description: 'Seed Zendesk tickets before the workflow runs.',
		settings: [],
		collections: [
			{
				key: 'tickets',
				label: 'Tickets',
				singularLabel: 'Ticket',
				applyMode: 'seed-array',
				seedArrayKey: 'tickets',
				fields: [
					{
						key: 'subject',
						label: 'Subject',
						type: 'string',
						required: true,
						placeholder: 'Checkout timeout',
					},
					{
						key: 'description',
						label: 'Description',
						type: 'text',
						placeholder: 'Customer reported 504...',
					},
					{
						key: 'priority',
						label: 'Priority',
						type: 'string',
						defaultValue: 'high',
						placeholder: 'high',
					},
				],
			},
		],
	},
};

export function getVendorSeedSchema(slug: string): SimulationSeedSchema {
	return (
		VENDOR_SEED_SCHEMAS[slug] ?? {
			description: `Configure initial simulated state for ${slug}.`,
			settings: [],
			collections: [],
		}
	);
}

export function buildVendorCapabilities(vendor: {
	slug: string;
	hosts: string[];
	fault_flags: string[];
}): SimulationVendorCapabilities {
	return {
		slug: vendor.slug,
		hosts: vendor.hosts,
		faultFlags: vendor.fault_flags,
		seedSchema: getVendorSeedSchema(vendor.slug),
	};
}

/**
 * Applies a structured vendor seed config (settings + collections) to an ai-gym tenant.
 *
 * Returns any `api-action` items that must be hydrated inside `tenant.run()` using the
 * simulated service's own HTTP/GraphQL API (e.g., Linear tickets, GitHub issues, Gmail emails).
 */
export interface PendingApiSeedAction {
	vendor: string;
	actionId: string;
	item: Record<string, unknown>;
}

export async function applyVendorSeed(params: {
	tenant: Tenant;
	vendor: string;
	payload: Record<string, unknown>;
	nextSeq: () => number;
}): Promise<PendingApiSeedAction[]> {
	const { tenant, vendor, payload, nextSeq } = params;
	const schema = VENDOR_SEED_SCHEMAS[vendor];

	// Structured schema payloads can be sent either explicitly (`{ __structured: true, settings, collections }`)
	// or as flat schema-keyed objects (`{ "workspace.name": "...", channels: [...], users: [...] }`).
	const structured = normalizeStructuredSeedPayload(schema, payload);
	if (!schema || !structured) {
		const sanitized = sanitizeNativeSeedPayload(vendor, payload, nextSeq);
		await tenant.seed(vendor, sanitized);
		return [];
	}

	const { settings, collections } = structured;
	const pendingActions: PendingApiSeedAction[] = [];

	// Build base native seed body from settings + seed-array / seed-nested-array collections.
	const baseBody: Record<string, unknown> = {};
	for (const field of schema.settings) {
		const rawVal = settings[field.key];
		if (rawVal === undefined || rawVal === '') continue;
		setDottedPath(baseBody, field.key, rawVal);
	}

	const eachPayloads: Array<Record<string, unknown>> = [];

	for (const col of schema.collections) {
		const rows = Array.isArray(collections[col.key])
			? (collections[col.key] as Array<Record<string, unknown>>)
			: [];
		if (rows.length === 0) continue;

		if (col.applyMode === 'seed-array' && col.seedArrayKey) {
			baseBody[col.seedArrayKey] = rows;
		} else if (col.applyMode === 'seed-nested-array' && col.seedNestedPath) {
			setPath(baseBody, col.seedNestedPath, rows);
		} else if (col.applyMode === 'seed-each' && col.seedWrapKey) {
			for (const row of rows) {
				eachPayloads.push({ [col.seedWrapKey]: row });
			}
		} else if (col.applyMode === 'api-action' && col.actionId) {
			for (const row of rows) {
				pendingActions.push({ vendor, actionId: col.actionId, item: row });
			}
		}
	}

	// Always call base seed at least once so workspace/team/domain/repos exist before api-actions.
	await tenant.seed(vendor, sanitizeNativeSeedPayload(vendor, baseBody, nextSeq));

	for (const entry of eachPayloads) {
		await tenant.seed(vendor, sanitizeNativeSeedPayload(vendor, entry, nextSeq));
	}

	return pendingActions;
}

/**
 * Runs deferred API-based seed actions inside an active `tenant.run()` scope so entities
 * that a vendor's native `seed()` hook doesn't expose (like Linear tickets, GitHub issues,
 * or Gmail emails) are created through the vendor's own simulated API.
 */
export async function executePendingApiSeedActions(
	tenant: Tenant,
	actions: PendingApiSeedAction[],
): Promise<void> {
	if (actions.length === 0) return;

	const credsCache = new Map<string, Record<string, unknown>>();
	const getCreds = async (vendor: string): Promise<Record<string, unknown>> => {
		const cached = credsCache.get(vendor);
		if (cached) return cached;
		const minted = (await tenant.mintCredential(vendor)) as Record<string, unknown>;
		credsCache.set(vendor, minted);
		return minted;
	};

	let linearTeamId: string | undefined;

	for (const action of actions) {
		try {
			if (action.actionId === 'linear.createIssue') {
				const creds = await getCreds('linear');
				const token = String(creds.api_key ?? creds.access_token ?? '');
				if (!linearTeamId) {
					const teamsRes = await fetch('https://api.linear.app/graphql', {
						method: 'POST',
						headers: {
							'content-type': 'application/json',
							authorization: token,
						},
						body: JSON.stringify({ query: '{ teams { nodes { id key name } } }' }),
					});
					const teamsJson = (await teamsRes.json()) as {
						data?: { teams?: { nodes?: Array<{ id: string }> } };
					};
					linearTeamId = teamsJson.data?.teams?.nodes?.[0]?.id;
				}
				if (!linearTeamId) continue;
				const title = String(action.item.title ?? '').trim();
				if (!title) continue;
				const description = String(action.item.description ?? '');
				const priority = Number(action.item.priority ?? 0) || 0;
				await fetch('https://api.linear.app/graphql', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						authorization: token,
					},
					body: JSON.stringify({
						query:
							'mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title } } }',
						variables: {
							input: {
								teamId: linearTeamId,
								title,
								description,
								priority,
							},
						},
					}),
				});
			} else if (action.actionId === 'github.createIssue') {
				const creds = await getCreds('github');
				const token = String(creds.token ?? creds.access_token ?? creds.pat ?? '');
				const owner = String(action.item.owner ?? 'acme').trim() || 'acme';
				const repo = String(action.item.repo ?? '').trim();
				const title = String(action.item.title ?? '').trim();
				if (!repo || !title) continue;
				await fetch(
					`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
					{
						method: 'POST',
						headers: {
							'content-type': 'application/json',
							authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							title,
							body: String(action.item.body ?? ''),
						}),
					},
				);
			} else if (action.actionId === 'gmail.deliverMessage') {
				const creds = await getCreds('gmail');
				let accessToken = typeof creds.access_token === 'string' ? creds.access_token : '';
				if (
					!accessToken &&
					typeof creds.refresh_token === 'string' &&
					typeof creds.token_uri === 'string'
				) {
					const tokenRes = await fetch(creds.token_uri, {
						method: 'POST',
						headers: { 'content-type': 'application/x-www-form-urlencoded' },
						body: new URLSearchParams({
							grant_type: 'refresh_token',
							refresh_token: creds.refresh_token,
							client_id: String(creds.client_id ?? ''),
							client_secret: String(creds.client_secret ?? ''),
						}).toString(),
					});
					const tokenJson = (await tokenRes.json()) as { access_token?: string };
					accessToken = tokenJson.access_token ?? '';
				}
				if (!accessToken) continue;
				const to = String(action.item.to ?? 'oncall@acme.test').trim() || 'oncall@acme.test';
				const subject = String(action.item.subject ?? 'Seeded email').trim();
				const body = String(action.item.body ?? '');
				const mime = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
				const raw = Buffer.from(mime, 'utf8').toString('base64url');
				await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({ raw }),
				});
			}
		} catch {
			// Best-effort seed hydration: skip malformed items rather than aborting the run.
		}
	}
}

interface NormalizedStructuredSeed {
	settings: Record<string, unknown>;
	collections: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStructuredSeedPayload(
	schema: SimulationSeedSchema | undefined,
	payload: Record<string, unknown>,
): NormalizedStructuredSeed | null {
	if (!schema) return null;

	if (payload.__structured === true) {
		return {
			settings: isPlainObject(payload.settings) ? payload.settings : {},
			collections: isPlainObject(payload.collections) ? payload.collections : {},
		};
	}

	const settingKeys = new Set(schema.settings.map((f) => f.key));
	const collectionKeys = new Set(schema.collections.map((c) => c.key));
	const hasSchemaKey = Object.keys(payload).some((key) => {
		if (settingKeys.has(key)) return true;
		if (collectionKeys.has(key) && Array.isArray(payload[key])) return true;
		return false;
	});
	if (!hasSchemaKey) return null;

	// Avoid hijacking native single-entity Slack payloads like `{ channel: {...}, user: {...} }`.
	const settings: Record<string, unknown> = {};
	const collections: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (settingKeys.has(key)) {
			settings[key] = value;
		} else if (collectionKeys.has(key) && Array.isArray(value)) {
			collections[key] = value;
		}
	}

	return { settings, collections };
}

function setDottedPath(target: Record<string, unknown>, dottedKey: string, value: unknown): void {
	const parts = dottedKey.split('.');
	setPath(target, parts, value);
}

function setPath(target: Record<string, unknown>, parts: string[], value: unknown): void {
	let curr: Record<string, unknown> = target;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		if (!curr[part] || typeof curr[part] !== 'object') {
			curr[part] = {};
		}
		curr = curr[part] as Record<string, unknown>;
	}
	curr[parts[parts.length - 1]] = value;
}

/**
 * Ensures required key fields are present before calling native Zig seed hooks.
 * For example, Slack's `seedMessage` asserts non-empty `channel` and `ts`.
 */
export function sanitizeNativeSeedPayload(
	service: string,
	payload: Record<string, unknown>,
	nextSeq: () => number,
): Record<string, unknown> {
	if (service === 'slack' && payload.message && typeof payload.message === 'object') {
		const msg = payload.message as Record<string, unknown>;
		const channel =
			typeof msg.channel === 'string' && msg.channel.trim() ? msg.channel.trim() : 'C01GENERAL1';
		const ts =
			typeof msg.ts === 'string' && msg.ts.trim()
				? msg.ts.trim()
				: `${1700000000 + nextSeq()}.000100`;
		return {
			...payload,
			message: {
				...msg,
				channel,
				ts,
			},
		};
	}
	return payload;
}
