#!/usr/bin/env node
// Seed a local n8n instance via the public API.
// Creates projects, fake credentials, workflows with sub-workflow dependencies
// (including some that cross project boundaries), and data tables.
//
// All seeded entities are tagged with a "[seed] " prefix (or "seed_" for
// data-tables, whose names disallow brackets) so the script can clear its
// own output before reseeding without touching pre-existing data.

const BASE = process.env.N8N_BASE_URL ?? 'http://localhost:5678';
const KEY = process.env.N8N_API_KEY;
if (!KEY) {
	console.error('N8N_API_KEY env var required');
	process.exit(1);
}

const CLEAR = (process.env.CLEAR ?? 'true').toLowerCase() !== 'false';
const SEED_PREFIX = '[seed] ';
const SEED_DT_PREFIX = 'seed_';

const CREDS_PER_PROJECT_RANGE = [1, 2];
const PERSONAL_WORKFLOWS = 50;
const DATA_TABLES_PER_PROJECT_PROB = 0.55;
const SUBWORKFLOW_PROB = 0.7;

// Workflow size buckets. The 5-25 medium band is the dominant case for
// community projects; small/large are minority outliers. Trenchcoats are
// kept deliberately small — they're legacy noise, not the bulk of the org.
function sampleWorkflowCount(kind /* 'community' | 'trenchcoat' */) {
	const r = Math.random();
	if (kind === 'trenchcoat') {
		if (r < 0.5) return randInt([6, 12]);
		if (r < 0.9) return randInt([12, 20]);
		return randInt([20, 28]);
	}
	if (r < 0.25) return randInt([2, 6]); // 25% tiny
	if (r < 0.85) return randInt([5, 25]); // 60% medium (the dominant band)
	return randInt([26, 42]); // 15% large
}

// Fraction of community projects that are fully self-contained — zero external
// workflow refs, zero external credential refs. Models siloed teams with their
// own scoped tooling.
const SELF_CONTAINED_PROJECT_PROB = 0.2;

// Sub-workflow ref distribution for parent (phase-2) workflows.
// Sum should be 1. Cross-community is intentionally tiny — those edges go
// through the Shared Platform lynchpins to produce visible "bridges".
const SUBWF_PROB_OWN = 0.35;
const SUBWF_PROB_SIBLING = 0.5; // different project, same community
const SUBWF_PROB_LYNCHPIN = 0.15; // shared platform lynchpin workflow

// Probability that a non-platform workflow also references a lynchpin
// credential from the Shared Platform project. Creates cross-cluster
// workflow → credential bridges in the dep graph.
const LYNCHPIN_CRED_REF_PROB = 0.18;

// Communities — projects within a community link densely; cross-community
// links go almost exclusively through Shared Platform lynchpins.
const COMMUNITIES = [
	{
		name: 'Revenue',
		projects: ['Marketing Analytics', 'Sales Operations', 'Growth Experiments', 'Lead Enrichment', 'Pipeline Health'],
	},
	{
		name: 'Customer',
		projects: ['Customer Success', 'Notifications Hub', 'Customer Onboarding', 'Renewals', 'Support Triage'],
	},
	{
		name: 'Engineering',
		projects: ['Engineering Reliability', 'Data Platform', 'Security & Compliance', 'Internal Tools', 'Observability'],
	},
	{
		name: 'Operations',
		projects: ['Finance & Billing', 'People Ops', 'Partnerships', 'Procurement', 'Vendor Management'],
	},
	{
		name: 'Knowledge',
		projects: ['Product Insights', 'Research & Discovery', 'Documentation Pipeline', 'Reporting Automations', 'Knowledge Base'],
	},
];
// Two utility projects host all the "hub" workflows and shared credentials.
// Community workflows reach into these via sub-workflow calls or cred refs;
// most other cross-project references are budget-capped per project.
const PLATFORM_PROJECT_NAME = 'Shared Platform';
const ORG_UTILITIES_PROJECT_NAME = 'Org Utilities';
const UTILITY_PROJECT_NAMES = [PLATFORM_PROJECT_NAME, ORG_UTILITIES_PROJECT_NAME];

// Per-project caps on *distinct external entity references* — these mean
// "how many different workflows / credentials from other projects this
// project's workflows collectively reach for". Trenchcoats and utility
// projects are exempt.
const EXT_WF_REF_BUDGET = [2, 5];
const EXT_CRED_REF_BUDGET = [5, 10];

// Number of data tables to expose via a proxy workflow + cross-project consumers.
const DATA_TABLE_PROXY_COUNT = 6;
const DATA_TABLE_PROXY_CONSUMERS = [3, 5];

// Heavy utility-usage controls. Across the whole org, most workflows reach into
// a utility workflow (Audit Logger, Tenant Resolver, etc.) and a sizeable
// fraction reach the central `customers` data table — but cross-project DT
// access is illegal in n8n, so non-Org-Utilities workflows go through a proxy
// workflow that owns the direct DataTable reference.
const UTILITY_REF_PROB = 0.6;
// Probability a phase-1/2 community workflow includes a customers-proxy ref
// (indirect central-DT access). Effective rate is lower than nominal because
// budget caps suppress some picks — tuned for ~5% total central-DT usage.
const CENTRAL_DT_REF_PROB = 0.08;
// Probability each phase-0 workflow inside the central-DT's owning project
// (Org Utilities) gets a direct DataTable node, modeling several service
// workflows reading the same source alongside the proxy.
const ORG_UTIL_DIRECT_DT_PROB = 0.5;
const CENTRAL_DATA_TABLE = {
	name: 'customers',
	ownerProject: ORG_UTILITIES_PROJECT_NAME,
	columns: [
		{ name: 'tenant_id', type: 'string' },
		{ name: 'name', type: 'string' },
		{ name: 'plan', type: 'string' },
		{ name: 'region', type: 'string' },
		{ name: 'created_at', type: 'date' },
	],
};

// "Trenchcoat" projects: legacy/dumping-ground projects that span concerns.
// Their workflows pick sub-workflow refs randomly across all communities —
// they show up in the graph as messy cross-cluster connectors.
const TRENCHCOAT_PROJECTS = ['Legacy Migrations', 'Skunkworks', "Founder's Workflows"];

// Each trenchcoat project hosts 2-3 internal "groups" — disconnected subsystems
// that share a project but never reference each other. Workflows pick sub-refs
// almost exclusively within their own group, so each trenchcoat project renders
// as 2-3 mini-clusters in the graph instead of one connected blob.
const TRENCHCOAT_GROUPS = {
	'Legacy Migrations': ['HR System', 'Old Billing', 'Acme Acquisition'],
	Skunkworks: ['AI Experiments', 'Mobile POC'],
	"Founder's Workflows": ['Early CRM', 'Reporting Hacks', 'First Slack Bot'],
};

const TRENCHCOAT_WORKFLOW_THEMES = [
	'TODO refactor',
	'Friday hack',
	'Customer X custom',
	'Old PHP sync',
	'Migration helper',
	'Temp fix',
	'Legacy adapter',
	'Acquisition cleanup',
	'Weekend script',
	'Manual override',
];

// Workflow themes per utility project. Shared Platform hosts plumbing /
// observability; Org Utilities hosts business-domain shared helpers.
const UTILITY_WORKFLOW_THEMES = {
	[PLATFORM_PROJECT_NAME]: [
		'Audit Logger',
		'Slack Alerts Dispatcher',
		'PII Scrubber',
		'Webhook Acknowledger',
		'Datadog Metric Pusher',
		'Sentry Error Forwarder',
		'Idempotency Guard',
		'Retry With Backoff',
	],
	[ORG_UTILITIES_PROJECT_NAME]: [
		'Tenant Resolver',
		'Vault Reader',
		'Feature Flag Resolver',
		'Notification Router',
		'SSO Token Exchange',
		'Customer ID Lookup',
		'Region Router',
		'Org Settings Reader',
	],
};

// Lynchpin credentials live in the utility projects. Community workflows can
// reference them across project boundaries — they become the cred-side bridges.
const LYNCHPIN_CRED_RECIPES = [
	{ type: 'slackApi', name: 'Production Slack Webhook', project: PLATFORM_PROJECT_NAME },
	{ type: 'httpHeaderAuth', name: 'Datadog API', project: PLATFORM_PROJECT_NAME },
	{ type: 'githubApi', name: 'GitHub (platform bot)', project: PLATFORM_PROJECT_NAME },
	{ type: 'openAiApi', name: 'OpenAI (production)', project: ORG_UTILITIES_PROJECT_NAME },
	{ type: 'httpBasicAuth', name: 'Vault (read-only)', project: ORG_UTILITIES_PROJECT_NAME },
];

const HEADERS = {
	'Content-Type': 'application/json',
	Accept: 'application/json',
	'X-N8N-API-KEY': KEY,
};

let totalReq = 0;
async function api(method, path, body) {
	totalReq++;
	const res = await fetch(`${BASE}/api/v1${path}`, {
		method,
		headers: HEADERS,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
	}
	if (res.status === 204) return null;
	const ctype = res.headers.get('content-type') ?? '';
	if (ctype.includes('application/json')) return res.json();
	return res.text();
}

async function listAll(path) {
	const out = [];
	let cursor = '';
	while (true) {
		const url = `${path}?limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
		const r = await api('GET', url);
		out.push(...(r.data ?? []));
		if (!r.nextCursor) break;
		cursor = r.nextCursor;
	}
	return out;
}

const PROJECT_NAMES = [...UTILITY_PROJECT_NAMES, ...COMMUNITIES.flatMap((c) => c.projects), ...TRENCHCOAT_PROJECTS];
const communityOf = (projectName) => COMMUNITIES.find((c) => c.projects.includes(projectName))?.name ?? null;
const isTrenchcoat = (projectName) => TRENCHCOAT_PROJECTS.includes(projectName);
const isUtility = (projectName) => UTILITY_PROJECT_NAMES.includes(projectName);

const CRED_RECIPES = [
	{
		type: 'notionApi',
		fields: () => ({ apiKey: `secret_${rand()}`, allowedHttpRequestDomains: 'none' }),
		nameFn: () => `Notion (${pickWord(['Marketing', 'Ops', 'CS', 'Eng', 'PM'])})`,
	},
	{
		type: 'httpHeaderAuth',
		fields: () => ({ name: 'Authorization', value: `Bearer ${rand(32)}`, allowedHttpRequestDomains: 'none' }),
		nameFn: () => `${pickWord(['Internal', 'Partner', 'Vendor', 'Legacy'])} API Auth`,
	},
	{
		type: 'httpBasicAuth',
		fields: () => ({
			user: pickWord(['svc-bot', 'integrations', 'n8n-runner']),
			password: rand(20),
			allowedHttpRequestDomains: 'none',
		}),
		nameFn: () => `${pickWord(['Mailgun', 'Zendesk', 'Confluence', 'Jira', 'OpsGenie'])} Basic`,
	},
	{
		type: 'slackApi',
		fields: () => ({ accessToken: `xoxb-${rand(48)}`, signatureSecret: rand(32), allowedHttpRequestDomains: 'none' }),
		nameFn: () => `Slack (${pickWord(['Alerts', 'Sales', 'Customer Success', 'Eng'])})`,
	},
	{
		type: 'postgres',
		fields: () => ({
			host: `db-${pickWord(['prod', 'staging', 'dev', 'reporting'])}.internal`,
			port: 5432,
			database: pickWord(['analytics', 'crm', 'billing', 'leads']),
			user: 'n8n',
			password: rand(24),
			allowUnauthorizedCerts: false,
			ssl: 'allow',
			sshTunnel: false,
		}),
		nameFn: () => `Postgres ${pickWord(['analytics', 'crm', 'billing', 'leads'])}`,
	},
	{
		type: 'mySql',
		fields: () => ({
			host: `mysql-${pickWord(['us', 'eu', 'apac'])}.internal`,
			port: 3306,
			database: pickWord(['orders', 'inventory', 'pricing']),
			user: 'n8n',
			password: rand(24),
			ssl: false,
			sshTunnel: false,
		}),
		nameFn: () => `MySQL ${pickWord(['orders', 'inventory', 'pricing'])}`,
	},
	{
		type: 'githubApi',
		fields: () => ({
			accessToken: `ghp_${rand(36)}`,
			server: 'https://api.github.com',
			user: 'n8n-bot',
			allowedHttpRequestDomains: 'none',
		}),
		nameFn: () => `GitHub (${pickWord(['CI', 'Release', 'Issues', 'Insights'])})`,
	},
	{
		type: 'openAiApi',
		fields: () => ({ apiKey: `sk-${rand(40)}`, header: false, allowedHttpRequestDomains: 'none' }),
		nameFn: () => `OpenAI (${pickWord(['classifier', 'summarizer', 'embeddings'])})`,
	},
];

function rand(len = 16) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let s = '';
	for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
	return s;
}
function pickWord(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}
function pick(arr, n) {
	const c = [...arr];
	const out = [];
	for (let i = 0; i < n && c.length; i++) {
		out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
	}
	return out;
}
function randInt([lo, hi]) {
	return lo + Math.floor(Math.random() * (hi - lo + 1));
}

const WORKFLOW_THEMES = [
	'Daily Sync',
	'Lead Notifier',
	'Slack Digest',
	'Webhook Ingest',
	'Report Builder',
	'Customer Health Check',
	'Stale Issue Sweeper',
	'Churn Risk Scoring',
	'Onboarding Email Drip',
	'Stripe Invoice Fanout',
	'PagerDuty Bridge',
	'Notion Backup',
	'GitHub PR Triage',
	'Support Tag Enrichment',
	'OpenAI Summarizer',
	'Postgres Mirror',
	'Pricing Cache Refresh',
	'Marketing Attribution',
	'Twitter Mentions',
	'Calendar Reconciliation',
];

function workflowNodes({ theme, credPick, subWorkflowIds, dataTableRef, centralDataTableRef }) {
	const nodes = [];
	const connections = {};
	const addConn = (from, to) => {
		connections[from] = connections[from] ?? { main: [[]] };
		connections[from].main[0].push({ node: to, type: 'main', index: 0 });
	};

	const triggerType = pickWord(['webhook', 'schedule', 'manual']);
	if (triggerType === 'webhook') {
		nodes.push({
			parameters: { httpMethod: 'POST', path: `seed-${rand(8)}`, responseMode: 'lastNode' },
			id: rand(36),
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [240, 300],
			webhookId: rand(36),
		});
	} else if (triggerType === 'schedule') {
		nodes.push({
			parameters: { rule: { interval: [{ field: 'hours', hoursInterval: randInt([1, 12]) }] } },
			id: rand(36),
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [240, 300],
		});
	} else {
		nodes.push({
			parameters: {},
			id: rand(36),
			name: "When clicking 'Execute workflow'",
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [240, 300],
		});
	}
	const triggerName = nodes[0].name;

	nodes.push({
		parameters: {
			assignments: {
				assignments: [
					{ id: rand(8), name: 'theme', value: theme, type: 'string' },
					{ id: rand(8), name: 'createdAt', value: '={{$now}}', type: 'string' },
				],
			},
			options: {},
		},
		id: rand(36),
		name: 'Edit Fields',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [460, 300],
	});
	addConn(triggerName, 'Edit Fields');

	let lastNode = 'Edit Fields';
	if (credPick && credPick.length > 0) {
		const httpCred = credPick.find((c) =>
			['httpHeaderAuth', 'httpBasicAuth', 'notionApi', 'slackApi', 'githubApi', 'openAiApi'].includes(c.type),
		);
		if (httpCred) {
			if (httpCred.type === 'httpBasicAuth' || httpCred.type === 'httpHeaderAuth') {
				nodes.push({
					parameters: {
						method: 'GET',
						url: `https://api.example.com/${theme.toLowerCase().replace(/\s+/g, '-')}`,
						options: {},
						authentication: 'genericCredentialType',
						genericAuthType: httpCred.type,
					},
					id: rand(36),
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [680, 300],
					credentials: { [httpCred.type]: { id: httpCred.id, name: httpCred.name } },
				});
				addConn(lastNode, 'HTTP Request');
				lastNode = 'HTTP Request';
			} else if (httpCred.type === 'slackApi') {
				nodes.push({
					parameters: { resource: 'message', operation: 'post', channel: '#alerts', text: `={{$json["theme"]}}` },
					id: rand(36),
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.2,
					position: [680, 300],
					credentials: { slackApi: { id: httpCred.id, name: httpCred.name } },
				});
				addConn(lastNode, 'Slack');
				lastNode = 'Slack';
			} else if (httpCred.type === 'notionApi') {
				nodes.push({
					parameters: { resource: 'page', operation: 'create', pageId: 'root', title: theme },
					id: rand(36),
					name: 'Notion',
					type: 'n8n-nodes-base.notion',
					typeVersion: 2.2,
					position: [680, 300],
					credentials: { notionApi: { id: httpCred.id, name: httpCred.name } },
				});
				addConn(lastNode, 'Notion');
				lastNode = 'Notion';
			} else if (httpCred.type === 'githubApi') {
				nodes.push({
					parameters: { resource: 'issue', operation: 'getAll', owner: 'n8n-io', repository: 'n8n' },
					id: rand(36),
					name: 'GitHub',
					type: 'n8n-nodes-base.github',
					typeVersion: 1,
					position: [680, 300],
					credentials: { githubApi: { id: httpCred.id, name: httpCred.name } },
				});
				addConn(lastNode, 'GitHub');
				lastNode = 'GitHub';
			} else if (httpCred.type === 'openAiApi') {
				nodes.push({
					parameters: { resource: 'text', operation: 'message', model: 'gpt-4o-mini' },
					id: rand(36),
					name: 'OpenAI',
					type: 'n8n-nodes-base.openAi',
					typeVersion: 1.3,
					position: [680, 300],
					credentials: { openAiApi: { id: httpCred.id, name: httpCred.name } },
				});
				addConn(lastNode, 'OpenAI');
				lastNode = 'OpenAI';
			}
		}
		const dbCred = credPick.find((c) => ['postgres', 'mySql'].includes(c.type));
		if (dbCred) {
			const isPg = dbCred.type === 'postgres';
			nodes.push({
				parameters: {
					operation: 'executeQuery',
					query: `SELECT 1 AS ping_${theme.toLowerCase().replace(/\s+/g, '_')};`,
				},
				id: rand(36),
				name: isPg ? 'Postgres' : 'MySQL',
				type: isPg ? 'n8n-nodes-base.postgres' : 'n8n-nodes-base.mySql',
				typeVersion: isPg ? 2.5 : 2.4,
				position: [900, 300],
				credentials: { [dbCred.type]: { id: dbCred.id, name: dbCred.name } },
			});
			addConn(lastNode, isPg ? 'Postgres' : 'MySQL');
			lastNode = isPg ? 'Postgres' : 'MySQL';
		}
	}

	if (centralDataTableRef && centralDataTableRef.id !== dataTableRef?.id) {
		nodes.push({
			parameters: {
				resource: 'row',
				operation: 'getMany',
				dataTableId: { __rl: true, mode: 'id', value: centralDataTableRef.id },
			},
			id: rand(36),
			name: 'Customers',
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1.1,
			position: [1120, 300],
		});
		addConn(lastNode, 'Customers');
		lastNode = 'Customers';
	}

	if (dataTableRef) {
		nodes.push({
			parameters: {
				resource: 'row',
				operation: 'getMany',
				dataTableId: { __rl: true, mode: 'id', value: dataTableRef.id },
			},
			id: rand(36),
			name: 'Data table',
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1.1,
			position: [centralDataTableRef ? 1340 : 1120, 300],
		});
		addConn(lastNode, 'Data table');
		lastNode = 'Data table';
	}

	if (subWorkflowIds && subWorkflowIds.length > 0) {
		const offset = (dataTableRef ? 1 : 0) + (centralDataTableRef ? 1 : 0);
		const baseX = 1120 + offset * 220;
		subWorkflowIds.forEach((subId, i) => {
			const nodeName = `Execute Sub ${i + 1}`;
			nodes.push({
				parameters: { workflowId: { __rl: true, value: subId, mode: 'id' }, mode: 'each' },
				id: rand(36),
				name: nodeName,
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.2,
				position: [baseX + i * 220, 300],
			});
			addConn(lastNode, nodeName);
			lastNode = nodeName;
		});
	}

	return { nodes, connections };
}

const log = (...args) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);

async function clearSeeded() {
	log('Clearing previously-seeded entities...');

	const projects = await listAll('/projects');
	const personal = projects.find((p) => p.type === 'personal');
	const personalPrefix = personal ? `${personal.name}: ` : null;
	const legacyDtPattern = /^[a-z_]+_[A-Za-z0-9]{4}$/;

	const ownerProjectId = (shared) => {
		if (!shared || shared.length === 0) return null;
		const owner = shared.find((s) => s.role && s.role.endsWith(':owner'));
		return owner?.projectId ?? owner?.project?.id ?? shared[0].projectId ?? shared[0].id ?? null;
	};

	// Pre-scan workflows to discover the full set of seeded project IDs — this
	// catches projects from older seed runs whose names are no longer in
	// PROJECT_NAMES. Any team project owning a [seed]-prefixed entity is treated
	// as a seed project for cleanup.
	const allWorkflows = await listAll('/workflows');
	const allCreds = await listAll('/credentials');
	const allDts = await listAll('/data-tables');
	const seedProjectIds = new Set();
	for (const w of allWorkflows) {
		if (!w.name?.startsWith(SEED_PREFIX)) continue;
		const pid = ownerProjectId(w.shared);
		if (pid && pid !== personal?.id) seedProjectIds.add(pid);
	}
	for (const c of allCreds) {
		if (!c.name?.startsWith(SEED_PREFIX)) continue;
		const pid = ownerProjectId(c.shared);
		if (pid && pid !== personal?.id) seedProjectIds.add(pid);
	}
	for (const d of allDts) {
		if (!d.name?.startsWith(SEED_DT_PREFIX)) continue;
		if (d.projectId && d.projectId !== personal?.id) seedProjectIds.add(d.projectId);
	}
	// Also include any team project whose name matches the current PROJECT_NAMES list.
	for (const p of projects) {
		if (p.type === 'team' && PROJECT_NAMES.includes(p.name)) seedProjectIds.add(p.id);
	}
	const seedProjects = projects.filter((p) => seedProjectIds.has(p.id));

	const seedWfs = allWorkflows.filter((w) => {
		if (w.name?.startsWith(SEED_PREFIX)) return true;
		const ownerPid = ownerProjectId(w.shared);
		if (ownerPid && seedProjectIds.has(ownerPid)) return true;
		if (personalPrefix && w.name?.startsWith(personalPrefix)) return true;
		return false;
	});
	log(`  ${seedWfs.length} workflows to delete`);
	for (const w of seedWfs) {
		try {
			if (w.active) await api('POST', `/workflows/${w.id}/deactivate`);
			await api('DELETE', `/workflows/${w.id}`);
		} catch (e) {
			log('    wf delete failed:', w.id, String(e).slice(0, 160));
		}
	}

	const seedCreds = allCreds.filter((c) => {
		if (c.name?.startsWith(SEED_PREFIX)) return true;
		const ownerPid = ownerProjectId(c.shared);
		return ownerPid && seedProjectIds.has(ownerPid);
	});
	log(`  ${seedCreds.length} credentials to delete`);
	for (const c of seedCreds) {
		try {
			await api('DELETE', `/credentials/${c.id}`);
		} catch (e) {
			log('    cred delete failed:', c.id, String(e).slice(0, 160));
		}
	}

	const seedDts = allDts.filter((d) => {
		if (d.name?.startsWith(SEED_DT_PREFIX)) return true;
		if (d.projectId && seedProjectIds.has(d.projectId)) return true;
		// legacy data-tables created in the personal project by the previous run
		if (d.projectId === personal?.id && legacyDtPattern.test(d.name ?? '')) return true;
		return false;
	});
	log(`  ${seedDts.length} data tables to delete`);
	for (const d of seedDts) {
		try {
			await api('DELETE', `/data-tables/${d.id}`);
		} catch (e) {
			log('    dt delete failed:', d.id, String(e).slice(0, 160));
		}
	}

	log(`  ${seedProjects.length} team projects to delete`);
	for (const p of seedProjects) {
		try {
			await api('DELETE', `/projects/${p.id}`);
		} catch (e) {
			log('    project delete failed:', p.id, String(e).slice(0, 160));
		}
	}

	// Sweep orphan team projects — empty (no workflows / creds / dts), not
	// named "My project" (the n8n default), and not on the current PROJECT_NAMES
	// list. These are leftovers from earlier seed runs whose name set changed.
	const remainingWorkflows = await listAll('/workflows');
	const remainingCreds = await listAll('/credentials');
	const remainingDts = await listAll('/data-tables');
	const projectsWithContent = new Set();
	for (const w of remainingWorkflows) {
		const pid = ownerProjectId(w.shared);
		if (pid) projectsWithContent.add(pid);
	}
	for (const c of remainingCreds) {
		const pid = ownerProjectId(c.shared);
		if (pid) projectsWithContent.add(pid);
	}
	for (const d of remainingDts) if (d.projectId) projectsWithContent.add(d.projectId);

	const projectsAfter = await listAll('/projects');
	const orphans = projectsAfter.filter(
		(p) =>
			p.type === 'team' &&
			!projectsWithContent.has(p.id) &&
			p.name !== 'My project' &&
			!PROJECT_NAMES.includes(p.name),
	);
	log(`  ${orphans.length} empty orphan projects to delete`);
	for (const p of orphans) {
		try {
			await api('DELETE', `/projects/${p.id}`);
		} catch (e) {
			log('    orphan delete failed:', p.name, String(e).slice(0, 160));
		}
	}

	log('Clear done.');
}

async function main() {
	log('Seeding n8n at', BASE);

	if (CLEAR) await clearSeeded();

	log('Fetching projects...');
	const initialProjects = await listAll('/projects');
	const personal = initialProjects.find((p) => p.type === 'personal');
	log('Personal project:', personal.id);

	const existingTeamNames = new Set(initialProjects.filter((p) => p.type === 'team').map((p) => p.name));
	const toCreate = PROJECT_NAMES.filter((n) => !existingTeamNames.has(n));
	log(`Creating ${toCreate.length} new team projects...`);
	for (const name of toCreate) {
		try {
			await api('POST', '/projects', { name });
		} catch (e) {
			log('  project create failed:', name, String(e).slice(0, 200));
		}
	}

	const projectsResp = await listAll('/projects');
	const teamProjects = projectsResp.filter((p) => p.type === 'team' && PROJECT_NAMES.includes(p.name));
	const utilityProjects = UTILITY_PROJECT_NAMES.map((n) => teamProjects.find((p) => p.name === n)).filter(
		Boolean,
	);
	const platformProject = utilityProjects.find((p) => p.name === PLATFORM_PROJECT_NAME);
	if (!platformProject || utilityProjects.length !== UTILITY_PROJECT_NAMES.length) {
		log('FATAL: utility projects not created');
		return;
	}
	const utilityProjectIds = new Set(utilityProjects.map((p) => p.id));
	log(`Team projects available: ${teamProjects.length} (utility projects: ${utilityProjects.map((p) => p.name).join(', ')})`);
	const communityProjects = teamProjects.filter((p) => !utilityProjectIds.has(p.id));
	const allTargetProjects = [personal, ...communityProjects];

	log('Creating credentials...');
	const credsByProject = new Map();
	for (const proj of allTargetProjects) {
		credsByProject.set(proj.id, []);
		const n = randInt(CREDS_PER_PROJECT_RANGE);
		const recipes = Array.from({ length: n }, () => CRED_RECIPES[Math.floor(Math.random() * CRED_RECIPES.length)]);
		for (const recipe of recipes) {
			try {
				const created = await api('POST', '/credentials', {
					name: `${SEED_PREFIX}${recipe.nameFn()}`,
					type: recipe.type,
					data: recipe.fields(),
					projectId: proj.id,
				});
				credsByProject.get(proj.id).push({ id: created.id, name: created.name, type: recipe.type });
			} catch (e) {
				log('  cred create failed:', recipe.type, String(e).slice(0, 200));
			}
		}
		log(`  ${proj.name}: ${credsByProject.get(proj.id).length} credentials`);
	}

	// Lynchpin credentials live in the utility projects. Community workflows
	// reference them across project boundaries → cross-cluster wf→cred edges.
	log('Creating lynchpin credentials in utility projects...');
	const lynchpinCreds = [];
	for (const recipe of LYNCHPIN_CRED_RECIPES) {
		const matching = CRED_RECIPES.find((r) => r.type === recipe.type);
		if (!matching) continue;
		const owner = utilityProjects.find((p) => p.name === recipe.project) ?? platformProject;
		try {
			const created = await api('POST', '/credentials', {
				name: `${SEED_PREFIX}${recipe.name}`,
				type: recipe.type,
				data: matching.fields(),
				projectId: owner.id,
			});
			lynchpinCreds.push({ id: created.id, name: created.name, type: recipe.type, ownerId: owner.id });
			log(`  ${recipe.name} (${recipe.type}) → ${owner.name}`);
		} catch (e) {
			log('  lynchpin cred failed:', recipe.type, String(e).slice(0, 200));
		}
	}

	// Central data table — single shared lookup table everyone reaches into.
	const centralDtOwner =
		utilityProjects.find((p) => p.name === CENTRAL_DATA_TABLE.ownerProject) ?? platformProject;
	let centralDataTable = null;
	try {
		const created = await api('POST', '/data-tables', {
			name: `${SEED_DT_PREFIX}${CENTRAL_DATA_TABLE.name}`,
			projectId: centralDtOwner.id,
			columns: CENTRAL_DATA_TABLE.columns,
		});
		centralDataTable = { id: created.id, name: created.name };
		// Seed it with a few rows so it isn't empty
		const sampleRows = Array.from({ length: 20 }, (_, i) => ({
			tenant_id: `tenant_${rand(8)}`,
			name: `${pickWord(['Acme', 'Globex', 'Initech', 'Umbrella', 'Wonka', 'Stark', 'Wayne'])} ${i + 1}`,
			plan: pickWord(['free', 'pro', 'enterprise']),
			region: pickWord(['us-east', 'us-west', 'eu-west', 'ap-south']),
			created_at: new Date(Date.now() - Math.floor(Math.random() * 365 * 86400e3)).toISOString(),
		}));
		await api('POST', `/data-tables/${created.id}/rows`, { data: sampleRows });
		log(`Central data table: ${created.name} → ${centralDtOwner.name} (${sampleRows.length} rows)`);
	} catch (e) {
		log('  central data table failed:', String(e).slice(0, 200));
	}

	// Plan workflow counts so we can do a two-phase build with cross-project refs.
	const plan = new Map();
	for (const proj of allTargetProjects) {
		let target;
		if (proj.id === personal.id) target = PERSONAL_WORKFLOWS;
		else if (isTrenchcoat(proj.name)) target = sampleWorkflowCount('trenchcoat');
		else target = sampleWorkflowCount('community');
		const leafCount = Math.max(2, Math.floor(target * 0.4));
		plan.set(proj.id, { proj, target, leafCount, creds: credsByProject.get(proj.id) ?? [] });
	}

	const poolByProject = new Map();
	const globalPool = [];

	const createWf = async ({
		proj,
		theme,
		credPick,
		subWorkflowIds,
		dataTableRef,
		centralDataTableRef,
		idx,
		namePrefix,
		group,
	}) => {
		const { nodes, connections } = workflowNodes({
			theme,
			credPick,
			subWorkflowIds,
			dataTableRef,
			centralDataTableRef,
		});
		const groupTag = group ? `[${group}] ` : '';
		const defaultPrefix = `${proj.name}: ${groupTag}${theme}`;
		try {
			const wf = await api('POST', '/workflows', {
				name: `${SEED_PREFIX}${namePrefix ?? defaultPrefix} ${idx}`,
				nodes,
				connections,
				settings: { executionOrder: 'v1' },
				projectId: proj.id,
			});
			const rec = { id: wf.id, projectId: proj.id, projectName: proj.name, name: wf.name, group: group ?? null };
			poolByProject.get(proj.id).push(rec);
			globalPool.push(rec);
			return rec;
		} catch (e) {
			log('  wf create failed:', theme, String(e).slice(0, 300));
			return null;
		}
	};

	// Phase 0: lynchpin workflows in each utility project. Leaves — get
	// referenced widely by phase-2 community workflows. Some Org Utilities
	// workflows also read the central data table directly (siblings of the
	// Customers Proxy).
	const lynchpinWorkflows = [];
	for (const utilProj of utilityProjects) {
		poolByProject.set(utilProj.id, []);
		const themes = UTILITY_WORKFLOW_THEMES[utilProj.name] ?? [];
		const utilCreds = lynchpinCreds.filter((c) => c.ownerId === utilProj.id);
		const isOrgUtil = utilProj.name === ORG_UTILITIES_PROJECT_NAME;
		log(`Creating ${themes.length} utility workflows in ${utilProj.name}...`);
		for (let i = 0; i < themes.length; i++) {
			const theme = themes[i];
			const credPick = utilCreds.length ? [utilCreds[i % utilCreds.length]] : [];
			const directDt =
				isOrgUtil && centralDataTable && Math.random() < ORG_UTIL_DIRECT_DT_PROB
					? centralDataTable
					: null;
			const wf = await createWf({
				proj: utilProj,
				theme,
				credPick,
				subWorkflowIds: [],
				centralDataTableRef: directDt,
				idx: i + 1,
				namePrefix: `${utilProj.name}: ${theme}`,
			});
			if (wf) lynchpinWorkflows.push(wf);
		}
	}
	const utilityWorkflowIds = new Set(lynchpinWorkflows.map((w) => w.id));

	// Customers proxy: the only workflow that directly references the central
	// data table. Other projects "use" the central DT by calling this proxy
	// via ExecuteWorkflow — modeling the n8n constraint that DataTable nodes
	// can only point at tables in the same project.
	let customersProxy = null;
	const orgUtilProj = utilityProjects.find((p) => p.name === ORG_UTILITIES_PROJECT_NAME);
	if (centralDataTable && orgUtilProj) {
		customersProxy = await createWf({
			proj: orgUtilProj,
			theme: 'Customers Proxy',
			credPick: [],
			subWorkflowIds: [],
			centralDataTableRef: centralDataTable,
			idx: 1,
			namePrefix: `${orgUtilProj.name}: Customers Proxy`,
		});
		if (customersProxy) log(`Customers proxy workflow: ${customersProxy.name}`);
	}

	// Helper: maybe inject a utility-workflow ref + customers-proxy ref into a
	// workflow's parameters. Non-utility workflows get the central data table
	// indirectly by calling the proxy — direct DataTable nodes for the central
	// table only live inside Org Utilities.
	const applyOrgUtilityRefs = ({ proj, subWorkflowIds }) => {
		if (isUtility(proj.name) || nonUtilityUsingIds.has(proj.id)) {
			return { subWorkflowIds };
		}
		const refs = projectRefs.get(proj.id);
		let updatedSubIds = subWorkflowIds;

		// Customers-proxy ref → indirect access to central data table.
		if (
			customersProxy &&
			Math.random() < CENTRAL_DT_REF_PROB &&
			!updatedSubIds.includes(customersProxy.id) &&
			(refs?.wfs.has(customersProxy.id) || refBudgetAllowsWf(proj.id, customersProxy))
		) {
			updatedSubIds = [...updatedSubIds, customersProxy.id];
			if (refs && customersProxy.projectId !== proj.id) refs.wfs.add(customersProxy.id);
		}

		// Generic utility-workflow ref.
		if (Math.random() < UTILITY_REF_PROB && lynchpinWorkflows.length > 0) {
			const alreadyOwned = lynchpinWorkflows.filter((w) => refs?.wfs.has(w.id));
			const pool =
				alreadyOwned.length > 0 && Math.random() < 0.7 ? alreadyOwned : lynchpinWorkflows;
			const cand = pool[Math.floor(Math.random() * pool.length)];
			if (cand && (refs?.wfs.has(cand.id) || refBudgetAllowsWf(proj.id, cand))) {
				if (!updatedSubIds.includes(cand.id)) {
					updatedSubIds = [...updatedSubIds, cand.id];
					if (refs && cand.projectId !== proj.id) refs.wfs.add(cand.id);
				}
			}
		}

		return { subWorkflowIds: updatedSubIds };
	};

	// Pick 9 community projects to opt out of utility-workflow references so
	// roughly 20 of 29 non-utility projects end up using utility workflows.
	const NON_UTILITY_USING_TARGET = 9;
	const eligibleForOptOut = communityProjects
		.filter((p) => !isTrenchcoat(p.name))
		.map((p) => p.id);
	const nonUtilityUsingIds = new Set(
		pick(eligibleForOptOut, Math.min(NON_UTILITY_USING_TARGET, eligibleForOptOut.length)),
	);
	log(`Non-utility-using community projects: ${nonUtilityUsingIds.size}`);

	// Self-contained projects are a SUBSET of non-utility-using ones (since a
	// truly self-contained project obviously can't reach for utilities either).
	// Roughly half the opt-outs go full self-contained.
	const selfContainedIds = new Set();
	for (const pid of nonUtilityUsingIds) {
		if (Math.random() < 0.5) selfContainedIds.add(pid);
	}
	const projectBudget = new Map();
	const projectRefs = new Map(); // projectId -> { wfs: Set, creds: Set }
	for (const proj of allTargetProjects) {
		projectRefs.set(proj.id, { wfs: new Set(), creds: new Set() });
		if (proj.id === personal.id || isTrenchcoat(proj.name) || isUtility(proj.name)) continue;
		const selfContained = selfContainedIds.has(proj.id);
		projectBudget.set(proj.id, {
			wf: selfContained ? 0 : randInt(EXT_WF_REF_BUDGET),
			cred: selfContained ? 0 : randInt(EXT_CRED_REF_BUDGET),
			selfContained,
		});
	}
	log(`Self-contained community projects: ${selfContainedIds.size}`);
	const refBudgetAllowsWf = (projectId, candidateWf) => {
		if (candidateWf.projectId === projectId) return true;
		const refs = projectRefs.get(projectId);
		if (refs.wfs.has(candidateWf.id)) return true;
		const budget = projectBudget.get(projectId);
		if (!budget) return true; // unbounded (trenchcoat / utility / personal)
		return refs.wfs.size < budget.wf;
	};
	const refBudgetAllowsCred = (projectId, candidateCredId, credOwnerProjectId) => {
		if (credOwnerProjectId === projectId) return true;
		const refs = projectRefs.get(projectId);
		if (refs.creds.has(candidateCredId)) return true;
		const budget = projectBudget.get(projectId);
		if (!budget) return true;
		return refs.creds.size < budget.cred;
	};

	// Phase 1: leaf workflows in every community project.
	log('Creating workflows — phase 1 (leaves)...');
	let phase1Count = 0;
	for (const proj of allTargetProjects) {
		poolByProject.set(proj.id, []);
		const p = plan.get(proj.id);
		const trenchcoat = isTrenchcoat(proj.name);
		const themePool = trenchcoat ? [...TRENCHCOAT_WORKFLOW_THEMES, ...WORKFLOW_THEMES] : WORKFLOW_THEMES;
		const groups = trenchcoat ? TRENCHCOAT_GROUPS[proj.name] ?? [] : [];
		for (let i = 0; i < p.leafCount; i++) {
			const theme = pickWord(themePool);
			const credPick = p.creds.length ? pick(p.creds, Math.min(p.creds.length, randInt([0, 2]))) : [];
			const group = groups.length ? groups[i % groups.length] : undefined;
			const { subWorkflowIds: subIds } = applyOrgUtilityRefs({
				proj,
				subWorkflowIds: [],
			});
			const wf = await createWf({
				proj,
				theme,
				credPick,
				subWorkflowIds: subIds,
				idx: i + 1,
				group,
			});
			if (wf) phase1Count++;
		}
	}
	log(`Phase 1 done: ${phase1Count} leaf workflows`);

	// Phase 2 sub-workflow pickers. Community workflows stay disciplined:
	//   own-project → community sibling → utility lynchpin.
	// Trenchcoats pick from anywhere (legacy mess). All external picks are
	// budget-checked so the picker can fall back to the own pool if a project
	// has already saturated its external ref budget.
	const pickCommunitySubWf = (projectId, projectName, count) => {
		const community = communityOf(projectName);
		const ownPool = poolByProject.get(projectId) ?? [];
		const lynchpinPool = nonUtilityUsingIds.has(projectId) ? [] : lynchpinWorkflows;
		const siblingPool = community
			? globalPool.filter(
					(w) => w.projectId !== projectId && communityOf(w.projectName) === community,
				)
			: [];

		const refs = projectRefs.get(projectId);
		const ids = [];
		for (let i = 0; i < count; i++) {
			const r = Math.random();
			let pool;
			if (r < SUBWF_PROB_OWN) pool = ownPool;
			else if (r < SUBWF_PROB_OWN + SUBWF_PROB_SIBLING) pool = siblingPool.length ? siblingPool : ownPool;
			else pool = lynchpinPool.length ? lynchpinPool : ownPool;
			if (pool.length === 0) continue;
			let cand = pool[Math.floor(Math.random() * pool.length)];
			if (!refBudgetAllowsWf(projectId, cand)) {
				if (ownPool.length === 0) continue;
				cand = ownPool[Math.floor(Math.random() * ownPool.length)];
			}
			if (ids.includes(cand.id)) continue;
			ids.push(cand.id);
			if (cand.projectId !== projectId) refs.wfs.add(cand.id);
		}
		return ids;
	};

	// Trenchcoat picker keeps the project mostly self-contained: refs stay
	// inside the source workflow's group with rare cross-group / external leaks.
	const pickTrenchcoatSubWf = (projectId, sourceGroup, count) => {
		const ownPool = poolByProject.get(projectId) ?? [];
		const sameGroupPool = sourceGroup ? ownPool.filter((w) => w.group === sourceGroup) : ownPool;
		const otherGroupPool = sourceGroup ? ownPool.filter((w) => w.group && w.group !== sourceGroup) : [];
		const lynchpinPool = lynchpinWorkflows;
		const refs = projectRefs.get(projectId);
		const ids = [];
		for (let i = 0; i < count; i++) {
			const r = Math.random();
			let pool;
			if (r < 0.75) pool = sameGroupPool.length ? sameGroupPool : ownPool;
			else if (r < 0.85) pool = otherGroupPool.length ? otherGroupPool : sameGroupPool.length ? sameGroupPool : ownPool;
			else pool = lynchpinPool.length ? lynchpinPool : ownPool;
			if (pool.length === 0) continue;
			const cand = pool[Math.floor(Math.random() * pool.length)];
			if (ids.includes(cand.id)) continue;
			ids.push(cand.id);
			if (cand.projectId !== projectId) refs.wfs.add(cand.id);
		}
		return ids;
	};

	const pickSubWorkflowIds = (projectId, projectName, sourceGroup, count) =>
		isTrenchcoat(projectName)
			? pickTrenchcoatSubWf(projectId, sourceGroup, count)
			: pickCommunitySubWf(projectId, projectName, count);

	log('Creating workflows — phase 2 (parents, community + trenchcoat refs)...');
	let phase2Count = 0;
	const edgeStats = { own: 0, sibling: 0, lynchpin: 0, trenchcoatCross: 0, lynchpinCred: 0 };
	for (const proj of allTargetProjects) {
		const p = plan.get(proj.id);
		const parentCount = p.target - p.leafCount;
		const community = communityOf(proj.name);
		const trenchcoat = isTrenchcoat(proj.name);
		const themePool = trenchcoat ? [...TRENCHCOAT_WORKFLOW_THEMES, ...WORKFLOW_THEMES] : WORKFLOW_THEMES;
		const groups = trenchcoat ? TRENCHCOAT_GROUPS[proj.name] ?? [] : [];
		// Trenchcoat projects reach for lynchpin creds slightly more often,
		// but less than before — they should mostly stay siloed.
		const lynchpinCredProb = trenchcoat ? LYNCHPIN_CRED_REF_PROB * 1.2 : LYNCHPIN_CRED_REF_PROB;
		const refs = projectRefs.get(proj.id);
		for (let i = 0; i < parentCount; i++) {
			const theme = pickWord(themePool);
			const group = groups.length ? groups[(p.leafCount + i) % groups.length] : undefined;
			let credPick = p.creds.length ? pick(p.creds, Math.min(p.creds.length, randInt([0, 2]))) : [];
			if (Math.random() < lynchpinCredProb && lynchpinCreds.length > 0) {
				const lc = lynchpinCreds[Math.floor(Math.random() * lynchpinCreds.length)];
				if (refBudgetAllowsCred(proj.id, lc.id, lc.ownerId)) {
					credPick = [lc, ...credPick.filter((c) => c.type !== lc.type)];
					refs.creds.add(lc.id);
					edgeStats.lynchpinCred++;
				}
			}
			const baseSubIds =
				Math.random() < SUBWORKFLOW_PROB
					? pickSubWorkflowIds(proj.id, proj.name, group, randInt([1, 3]))
					: [];
			const { subWorkflowIds: subIds } = applyOrgUtilityRefs({
				proj,
				subWorkflowIds: baseSubIds,
			});
			for (const subId of subIds) {
				const subWf = globalPool.find((w) => w.id === subId);
				if (!subWf) continue;
				if (subWf.projectId === proj.id) edgeStats.own++;
				else if (utilityProjectIds.has(subWf.projectId)) edgeStats.lynchpin++;
				else if (community && communityOf(subWf.projectName) === community) edgeStats.sibling++;
				else edgeStats.trenchcoatCross++;
			}
			const wf = await createWf({
				proj,
				theme,
				credPick,
				subWorkflowIds: subIds,
				idx: p.leafCount + i + 1,
				group,
			});
			if (wf) phase2Count++;
		}
	}
	log(`Phase 2 done: ${phase2Count} parent workflows`);
	log(
		`  edge stats — own:${edgeStats.own} sibling:${edgeStats.sibling} lynchpin:${edgeStats.lynchpin} trenchcoatCross:${edgeStats.trenchcoatCross} lynchpinCredRefs:${edgeStats.lynchpinCred}`,
	);

	const totalWf = phase1Count + phase2Count;
	log('Per-project workflow totals:');
	for (const proj of allTargetProjects) {
		log(`  ${proj.name}: ${poolByProject.get(proj.id).length}`);
	}
	log(`Total workflows created: ${totalWf}`);

	log('Creating data tables...');
	const dtNames = ['leads', 'tickets', 'orders', 'feature_flags', 'churn_risk', 'integrations', 'sla_targets'];
	const dataTablesByProject = new Map();
	let dtTotal = 0;
	for (const proj of allTargetProjects) {
		if (Math.random() > DATA_TABLES_PER_PROJECT_PROB) continue;
		const dtName = `${SEED_DT_PREFIX}${pickWord(dtNames)}_${rand(4)}`;
		try {
			const dt = await api('POST', `/data-tables`, {
				name: dtName,
				projectId: proj.id,
				columns: [
					{ name: 'label', type: 'string' },
					{ name: 'score', type: 'number' },
					{ name: 'is_active', type: 'boolean' },
					{ name: 'recorded_at', type: 'date' },
				],
			});
			dtTotal++;
			const list = dataTablesByProject.get(proj.id) ?? [];
			list.push({ id: dt.id, name: dt.name });
			dataTablesByProject.set(proj.id, list);
			const rowCount = randInt([5, 20]);
			const rows = Array.from({ length: rowCount }, () => ({
				label: pickWord(['alpha', 'beta', 'gamma', 'delta', 'epsilon']),
				score: Math.floor(Math.random() * 100),
				is_active: Math.random() < 0.7,
				recorded_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400e3)).toISOString(),
			}));
			try {
				await api('POST', `/data-tables/${dt.id}/rows`, { data: rows });
			} catch (e) {
				log('    row insert failed:', String(e).slice(0, 200));
			}
			log(`  ${proj.name}: ${dt.name} (${rowCount} rows)`);
		} catch (e) {
			log('  data table failed:', proj.name, String(e).slice(0, 200));
		}
	}
	log(`Total data tables created: ${dtTotal}`);

	// Phase 3: data-table-consuming workflows (each also calls a sub-workflow).
	log('Creating workflows — phase 3 (data table consumers)...');
	let phase3Count = 0;
	for (const proj of allTargetProjects) {
		const dts = dataTablesByProject.get(proj.id) ?? [];
		if (dts.length === 0) continue;
		const count = randInt([2, 3]);
		const p = plan.get(proj.id);
		const creds = p?.creds ?? [];
		for (let i = 0; i < count; i++) {
			const dt = dts[i % dts.length];
			const theme = `${pickWord(['Sync to', 'Report from', 'Backfill', 'Reconcile', 'Audit'])} ${dt.name.replace(SEED_DT_PREFIX, '')}`;
			let credPick = creds.length ? pick(creds, Math.min(creds.length, randInt([0, 1]))) : [];
			if (Math.random() < LYNCHPIN_CRED_REF_PROB && lynchpinCreds.length > 0) {
				const lc = lynchpinCreds[Math.floor(Math.random() * lynchpinCreds.length)];
				credPick = [lc, ...credPick.filter((c) => c.type !== lc.type)];
			}
			const baseSubIds = pickSubWorkflowIds(proj.id, proj.name, null, 1);
			const { subWorkflowIds: subIds } = applyOrgUtilityRefs({
				proj,
				subWorkflowIds: baseSubIds,
			});
			const wf = await createWf({
				proj,
				theme,
				credPick,
				subWorkflowIds: subIds,
				dataTableRef: dt,
				idx: i + 1,
				namePrefix: `${proj.name}: ${theme}`,
			});
			if (wf) phase3Count++;
		}
	}
	log(`Phase 3 done: ${phase3Count} data-table consumer workflows`);

	// Phase 4: data-table proxy workflows. A few data tables get exposed via a
	// wrapper workflow in their owning project; consumers in OTHER projects
	// then call that wrapper as a sub-workflow. Models the real n8n pattern
	// of sharing data across project boundaries via a workflow proxy.
	log('Creating workflows — phase 4 (cross-project data-table proxies)...');
	const allDataTables = [];
	for (const [pid, dts] of dataTablesByProject) {
		for (const dt of dts) allDataTables.push({ ...dt, projectId: pid });
	}
	// Skip personal-project + trenchcoat data tables. Trenchcoats stay isolated:
	// their data tables don't get promoted to org-wide proxies.
	const proxyableDts = allDataTables.filter((dt) => {
		if (dt.projectId === personal.id) return false;
		const owner = teamProjects.find((p) => p.id === dt.projectId);
		return owner && !isTrenchcoat(owner.name);
	});
	const chosenDts = pick(proxyableDts, Math.min(DATA_TABLE_PROXY_COUNT, proxyableDts.length));
	let proxyCount = 0;
	let proxyConsumerCount = 0;
	for (const dt of chosenDts) {
		const ownerProj = teamProjects.find((p) => p.id === dt.projectId);
		if (!ownerProj) continue;
		// Create the proxy workflow in the data table's project.
		const proxy = await createWf({
			proj: ownerProj,
			theme: `Proxy: read ${dt.name.replace(SEED_DT_PREFIX, '')}`,
			credPick: [],
			subWorkflowIds: [],
			dataTableRef: dt,
			idx: 1,
			namePrefix: `${ownerProj.name}: Proxy ${dt.name}`,
		});
		if (!proxy) continue;
		proxyCount++;

		// Pick consumer projects from a different community than the owner,
		// preferring projects that still have external-ref budget remaining.
		// Trenchcoats are excluded — they're isolated by design.
		const ownerCommunity = communityOf(ownerProj.name);
		const consumerCandidates = allTargetProjects.filter((p) => {
			if (p.id === ownerProj.id || p.id === personal.id || utilityProjectIds.has(p.id)) return false;
			if (isTrenchcoat(p.name)) return false;
			if (communityOf(p.name) === ownerCommunity) return false;
			const budget = projectBudget.get(p.id);
			if (!budget) return true;
			const refs = projectRefs.get(p.id);
			return refs.wfs.size < budget.wf;
		});
		const consumerCount = Math.min(consumerCandidates.length, randInt(DATA_TABLE_PROXY_CONSUMERS));
		const consumers = pick(consumerCandidates, consumerCount);
		for (const consumer of consumers) {
			const refs = projectRefs.get(consumer.id);
			const { subWorkflowIds: subIds } = applyOrgUtilityRefs({
				proj: consumer,
				subWorkflowIds: [proxy.id],
			});
			const consumerWf = await createWf({
				proj: consumer,
				theme: `Consume ${dt.name.replace(SEED_DT_PREFIX, '')}`,
				credPick: [],
				subWorkflowIds: subIds,
				idx: refs.wfs.size + 100,
				namePrefix: `${consumer.name}: Consume ${dt.name}`,
			});
			if (consumerWf) {
				proxyConsumerCount++;
				refs.wfs.add(proxy.id);
			}
		}
	}
	log(`Phase 4 done: ${proxyCount} proxies, ${proxyConsumerCount} cross-project consumers`);

	// Budget usage stats.
	let budgetedProjects = 0;
	let wfRefSum = 0;
	let credRefSum = 0;
	for (const [pid] of projectBudget) {
		const r = projectRefs.get(pid);
		budgetedProjects++;
		wfRefSum += r.wfs.size;
		credRefSum += r.creds.size;
	}
	if (budgetedProjects > 0) {
		log(
			`Budget summary across ${budgetedProjects} community projects — avg external wfs: ${(wfRefSum / budgetedProjects).toFixed(1)}, avg external creds: ${(credRefSum / budgetedProjects).toFixed(1)}`,
		);
	}

	log('Done. Total API requests:', totalReq);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
