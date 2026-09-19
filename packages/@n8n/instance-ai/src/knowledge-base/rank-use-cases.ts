import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
	INSTANCE_AI_KNOWLEDGE_BASE_SOURCE_DIR,
	KNOWLEDGE_BASE_USE_CASES_DIR,
} from './materialize-knowledge-base';

/**
 * Which tools are interchangeable, by family. `|` separates tools, `/` separates the spellings
 * of one tool (the first is its name). A tool can sit in two families.
 */
const FAMILIES: Record<string, string> = {
	email: 'gmail|microsoft outlook/outlook',
	notification: 'slack|microsoft teams/teams|gmail|microsoft outlook/outlook',
	chat: 'slack|microsoft teams/teams|discord|telegram',
	CRM: 'hubspot|pipedrive|salesforce|zoho crm/zoho',
	spreadsheet: 'google sheets/sheets|microsoft excel 365/excel/microsoft excel|airtable',
	docs: 'notion|google docs|coda',
	'issue tracker': 'jira|linear|github issues|asana|trello|clickup',
	'help desk': 'zendesk|freshdesk|intercom|help scout|gorgias',
	calendar: 'google calendar|microsoft outlook calendar/outlook calendar',
	'file storage': 'google drive|microsoft onedrive/onedrive|dropbox|box|aws s3/s3',
	form: 'typeform|jotform|google forms|n8n form|webflow',
	database:
		'postgres/postgresql|mysql|supabase|mongodb/mongo|airtable|microsoft sql/sql server/mssql',
	'AI model': 'openai/chatgpt|anthropic/claude|google gemini/gemini|mistral|ollama',
	'code hosting': 'github|gitlab|bitbucket',
	'email marketing': 'mailchimp|convertkit|brevo|activecampaign',
	'identity provider': 'okta|auth0|microsoft entra id/entra/azure ad|jumpcloud',
	'user directory':
		'google workspace admin/google workspace|microsoft entra id/entra/azure ad|okta',
	'e-commerce': 'shopify|woocommerce|magento|bigcommerce',
	social: 'x/twitter|reddit|linkedin|facebook|instagram|bluesky',
	scheduling: 'calendly|cal.com|acuity',
	'HR system': 'bamboohr|personio|workday|hibob|rippling',
	'task manager': 'todoist|asana|trello|clickup|microsoft to do|monday.com/monday',
	payments: 'stripe|paypal|paddle|chargebee',
	'incident alerting': 'pagerduty|opsgenie|incident.io',
	'error tracking': 'sentry|datadog|rollbar|bugsnag',
	'design tool': 'figma|sketch',
	'data warehouse': 'snowflake|google bigquery/bigquery|redshift|databricks',
	accounting: 'quickbooks|xero',
	SMS: 'twilio|vonage|messagebird',
	'app builder': 'bubble|retool|softr|glide|appsmith',
};
/** The selector keys of the templates, by tool name. */
const TEMPLATE_KEYS: Record<string, string> = {
	slack: 'slack',
	'microsoft teams': 'teams',
	gmail: 'gmail',
	'microsoft outlook': 'outlook',
	'google sheets': 'sheets',
	'microsoft excel 365': 'excel',
};
/** The selector constant per family: the template holds one ready node per key behind it. */
const SELECTORS: Record<string, string> = {
	notification: 'NOTIFY',
	email: 'INBOX',
	spreadsheet: 'SPREADSHEET',
};

/** Spelling to tool name, and tool name to its families. */
const canonical = new Map<string, string>();
const familiesOf = new Map<string, string[]>();
for (const [family, tools] of Object.entries(FAMILIES)) {
	for (const group of tools.split('|')) {
		const spellings = group.split('/');
		const name = spellings[0];
		for (const spelling of spellings) canonical.set(spelling, name);
		familiesOf.set(name, [...(familiesOf.get(name) ?? []), family]);
	}
}

interface Entry {
	rank: number;
	title: string;
	tools: string;
	/** Path relative to the use-cases folder, or `-`. */
	template: string;
	description: string;
}

interface UserTools {
	/** Every spelling the user gave plus the tool names they resolve to, lower case. */
	names: Set<string>;
	/** Family to the first user tool that covers it: the label as written, and the tool name. */
	covered: Map<string, { label: string; name: string }>;
}

/** The `## <rank>. <title>` sections of a role file. */
function parseEntries(content: string): Entry[] {
	const entries: Entry[] = [];
	let current: Entry | undefined;
	for (const line of content.split('\n')) {
		const header = /^## (\d+)\. (.*)$/.exec(line);
		if (header) {
			current = {
				rank: Number(header[1]),
				title: header[2],
				tools: '',
				template: '-',
				description: '',
			};
			entries.push(current);
		} else if (!current) {
			continue;
		} else if (line.startsWith('- Tools: ')) {
			current.tools = line.slice('- Tools: '.length);
		} else if (line.startsWith('- Template: ')) {
			current.template = line.slice('- Template: '.length);
		} else if (!line.startsWith('- ') && !current.description && line.trim() !== '') {
			current.description = line;
		}
	}
	return entries;
}

/** The label, the text before and inside brackets, and each part of a `/` or `,` list. */
function spellingsOf(label: string): string[] {
	const text = label.toLowerCase();
	const spellings = [text];
	const bracket = /\(([^()]*)\)/.exec(text);
	if (bracket) spellings.push(text.slice(0, bracket.index), bracket[1]);
	const parts = text.split(/[/,]/);
	if (parts.length > 1) spellings.push(...parts);
	return spellings.map((spelling) => spelling.trim()).filter((spelling) => spelling !== '');
}

function cover(name: string, label: string, user: UserTools): void {
	user.names.add(name);
	for (const family of familiesOf.get(name) ?? []) {
		if (!user.covered.has(family)) user.covered.set(family, { label, name });
	}
}

function claim(spelling: string, label: string, user: UserTools): void {
	user.names.add(spelling);
	const name = canonical.get(spelling);
	if (name) {
		cover(name, label, user);
		return;
	}
	// Not a known spelling: any known spelling as a whole word inside the text.
	for (const [known, knownName] of canonical) {
		if (` ${spelling} `.includes(` ${known} `)) cover(knownName, label, user);
	}
}

/** Whether the template holds `const <name> = '`, the selector of a family. */
async function hasSelector(useCasesDir: string, entry: Entry, name: string): Promise<boolean> {
	if (entry.template === '-') return false;
	const source = await readFile(join(useCasesDir, entry.template), 'utf-8');
	return new RegExp(`^const ${name} = '`, 'm').test(source);
}

async function score(
	entry: Entry,
	user: UserTools,
	useCasesDir: string,
): Promise<{ score: number; swaps: string }> {
	let score = 0;
	const swaps: string[] = [];
	for (const item of entry.tools.split(', ')) {
		const match = /^(.*?) \((.*)\)$/.exec(item);
		if (!match) continue;
		const [, family, rawExample] = match;
		const example = rawExample.toLowerCase();
		if (user.names.has(canonical.get(example) ?? example)) {
			score++;
			continue;
		}
		const owned = user.covered.get(family);
		if (!owned) {
			score--;
			swaps.push(`${item} -> ?`);
			continue;
		}
		score++;
		const selector = SELECTORS[family];
		const key = TEMPLATE_KEYS[owned.name];
		const set =
			selector && key && (await hasSelector(useCasesDir, entry, selector))
				? ` [set ${selector}=${key}]`
				: '';
		swaps.push(`${item} -> ${owned.label}${set}`);
	}
	return { score, swaps: swaps.join('; ') || 'none' };
}

/**
 * The three use cases of `roleId` to offer for the user's tools, best first, one per line, tab
 * separated: rank, title, template file (or `-`), tools, swaps, description. Score: +1 for a
 * family the user has a tool for, -1 for a family they have no tool for, 0 for built-in nodes;
 * ties keep the corpus rank. `swaps` reads `family (example) -> Tool` when the user's tool
 * replaces the example, `... -> Tool [set NAME=key]` when the template also holds a ready node
 * for it behind `const NAME`, `family (example) -> ?` when the user has no tool of the family,
 * `none` when the entry runs on the user's tools as is. Tool names match case-insensitively,
 * with or without a vendor prefix or a note in brackets: "Twilio (SMS)", "MS Teams",
 * "Outlook 365" and "a / b" all work. Runs on the host, so the agent gets the ranking with the
 * answers and no sandbox command is needed.
 */
export async function rankUseCases(roleId: string, tools: string[]): Promise<string[]> {
	const useCasesDir = join(INSTANCE_AI_KNOWLEDGE_BASE_SOURCE_DIR, KNOWLEDGE_BASE_USE_CASES_DIR);
	const content = await readFile(join(useCasesDir, `${roleId}.md`), 'utf-8');
	const user: UserTools = { names: new Set(), covered: new Map() };
	for (const tool of tools) {
		const label = tool.trim();
		for (const spelling of spellingsOf(label)) claim(spelling, label, user);
	}
	const scored: Array<{ entry: Entry; score: number; swaps: string }> = [];
	for (const entry of parseEntries(content)) {
		scored.push({ entry, ...(await score(entry, user, useCasesDir)) });
	}
	return scored
		.sort((a, b) => b.score - a.score || a.entry.rank - b.entry.rank)
		.slice(0, 3)
		.map(({ entry, swaps }) =>
			[entry.rank, entry.title, entry.template, entry.tools, swaps, entry.description].join('\t'),
		);
}
