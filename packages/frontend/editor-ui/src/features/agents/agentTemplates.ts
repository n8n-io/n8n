import type { BaseTextKey } from '@n8n/i18n';
import type {
	AgentCardsConfig,
	AgentIntegrationConfig,
	AgentJsonConfig,
	AgentJsonToolConfig,
	AgentPersonalisation,
	AgentTaskConfig,
} from '@n8n/api-types';

type AgentTemplateGradient = AgentPersonalisation['gradient'];

/**
 * A one-click starter agent template. Selecting one writes a working example
 * onto a blank agent so the user sees something to react to instead of an
 * empty screen. `model` is deliberately absent: the seeded default model stays.
 */
export interface AgentTemplate {
	id: string;
	labelKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	icon: string;
	/** Avatar gradient shown on the option and written onto the agent. */
	gradient: AgentTemplateGradient;
	/** Written onto a blank agent. `model` is never set here. */
	config: {
		name: string;
		instructions: string;
		tools?: AgentJsonToolConfig[];
		/** Draft channel integrations (empty `credentialId`) so the trigger
		 * chips show as highlighted until the user connects a credential.
		 * The trigger types are derived from this list — no separate
		 * `connectedTriggers` field is needed. */
		integrations?: AgentIntegrationConfig[];
		/** Nested agent runtime config (web search, reasoning, etc.). Merged
		 * onto the existing config so a template can enable web search without
		 * wiping other runtime settings. */
		config?: {
			webSearch?: { enabled: boolean; provider?: 'auto' | 'native' | 'brave' | 'searxng' };
		};
		/** Result cards the agent shows in chat: default tone, allowed archetypes, named presets. */
		cards?: AgentCardsConfig;
	};
	/** Scheduled task bodies to create after the agent is persisted. The
	 * backend assigns each task an id and adds the matching `{ type: 'task',
	 * id, enabled }` ref to the config, so the template does not pre-populate
	 * the config's `tasks` array. */
	tasks?: AgentTaskConfig[];
}

/** Distinct from the home-screen suggestion catalog (`v1`). */
export const AGENT_TEMPLATE_SUGGESTIONS_VERSION = 'agent-templates-v1';

/**
 * Demo datasets for the card-first templates below. They live in the
 * instructions so the agent can answer — and show cards — with only a model
 * credential connected; swapping them for a Sheets / CRM / n8n tool is the
 * natural next step once the user likes the shape.
 */
const PIPELINE_DEMO_DATA = `Current pipeline (as of today; USD; stages: Qualified → Proposal → Negotiation → Closed won):
| Deal | Company | Owner | Stage | Value | Close date | Last touch |
| --- | --- | --- | --- | --- | --- | --- |
| Rollout for EMEA | Northwind Traders | Marta | Negotiation | 48,000 | Oct 24 | 2 days ago |
| Platform licence | Contoso | Jakub | Proposal | 36,500 | Nov 7 | yesterday |
| Pilot → paid | Fabrikam | Marta | Negotiation | 22,000 | Oct 17 | today |
| Data team seats | Tailspin Toys | Ola | Qualified | 9,800 | Nov 28 | 6 days ago |
| Renewal + upsell | Adventure Works | Jakub | Proposal | 31,200 | Oct 31 | 3 days ago |
| Agency bundle | Wide World Importers | Ola | Qualified | 14,400 | Dec 12 | 9 days ago |
| Security add-on | Litware | Marta | Closed won | 12,000 | Oct 3 | — |
| Onboarding package | Proseware | Jakub | Closed won | 7,500 | Oct 6 | — |
Last week's open pipeline was 158,000; this week it is 161,900. Target for Q4 closed-won: 120,000 (19,500 closed so far).`;

const SUPPORT_DEMO_DATA = `Open tickets (SLA: first reply within 4h for urgent, 24h otherwise):
| # | Subject | Requester | Priority | Age | Status | Last message |
| --- | --- | --- | --- | --- | --- | --- |
| 1042 | Invoice total doesn't match the PO | anna.kowalska@northwind.example | urgent | 1h 20m | new | "The PO says 4,800 but your invoice #INV-2291 shows 5,100. Can you check before Friday?" |
| 1039 | Can't connect Google Sheets after re-login | tom@fabrikam.example | high | 5h | waiting on us | "Still getting 'invalid_grant' after reconnecting twice." |
| 1037 | Export to CSV missing the date column | priya@contoso.example | normal | 1d 3h | waiting on customer | "Sent you the file with the missing column — let me know if that helps." |
| 1035 | Workflow runs twice on one webhook | dev@tailspin.example | high | 1d 9h | in progress | "Found duplicate executions at 09:14 and 09:14:03." |
| 1031 | How do I share a workflow with a contractor? | sam@litware.example | low | 2d | new | "Just need read access for one person." |
| 1028 | Request: dark mode for the public form | hello@proseware.example | low | 3d | new | "Would love this for our branding." |
| 1022 | Slack notifications stopped on Monday | ops@adventure-works.example | urgent | 4d | waiting on us | "No alerts since Monday 07:00, the channel is still connected." |
SLA this week: 31 tickets replied, 27 within SLA (87%); last week 91%. Median first reply: 2h 10m. Breaches: #1022 (urgent, 4d), #1039 (high, 5h).`;

const WORKFLOW_HEALTH_DEMO_DATA = `Workflow runs for yesterday (00:00–24:00 UTC):
| Workflow | Runs | Succeeded | Failed | Avg duration | Last failure |
| --- | --- | --- | --- | --- | --- |
| Invoice sync (Stripe → Xero) | 212 | 209 | 3 | 4.2s | 22:41 — Xero API 429 Too Many Requests, retried 3× |
| Lead enrichment | 96 | 96 | 0 | 11.8s | — |
| Daily digest email | 1 | 1 | 0 | 38s | — |
| Slack alerts (errors) | 54 | 52 | 2 | 1.1s | 09:14 — Slack channel_not_found for #ops-archive |
| Webhook intake (forms) | 318 | 318 | 0 | 0.6s | — |
| Weekly report (Sheets) | 0 | 0 | 0 | — | not scheduled yesterday |
Totals: 681 runs, 676 succeeded, 5 failed (99.3% success; day before: 99.7%). Hourly failures: 0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,3,0.`;

export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
	{
		id: 'pipeline-pulse',
		labelKey: 'agents.builder.templates.pipelinePulse.label',
		descriptionKey: 'agents.builder.templates.pipelinePulse.description',
		icon: 'trending-up',
		gradient: { from: '#C2410C', to: '#F59E0B', angle: 150, fromStop: 6, toStop: 94 },
		config: {
			name: 'Pipeline Pulse',
			instructions: `You are the sales pipeline assistant for a small B2B team. People ask you how the pipeline is doing, which deals need attention, what closes this month, and about single deals. Answer in one or two plain sentences and show the data in a card — a number when they ask "how much", a short table when they ask "which deals", a key/value card for one deal. Mention the owner and close date when they matter. Flag deals with no touch in more than 5 days. Never invent deals or figures; the data below is the only source of truth. Values are USD.\n\n${PIPELINE_DEMO_DATA}`,
			cards: {
				tone: 'terracotta',
				presets: [
					{
						name: 'Pipeline total',
						type: 'metric',
						useWhen:
							'the user asks how the pipeline is doing, how much is open, or how this week compares',
						fields:
							'value: open pipeline total; delta: change vs last week; breakdown: value per stage; label: "open pipeline"',
					},
					{
						name: 'Top deals',
						type: 'records',
						useWhen: 'the user asks which deals close soon, need attention, or belong to someone',
						fields:
							'columns: Deal, Company, Stage, Value (≤4); rows: the matching deals (≤5); total: count of matches; operation: read; target: "Pipeline"',
					},
					{
						name: 'Deal detail',
						type: 'keyValue',
						tone: 'paper',
						useWhen: 'the user asks about one specific deal',
						fields: 'pairs: Company, Owner, Stage, Value, Close date, Last touch',
					},
				],
			},
		},
	},
	{
		id: 'support-inbox-triage',
		labelKey: 'agents.builder.templates.supportInboxTriage.label',
		descriptionKey: 'agents.builder.templates.supportInboxTriage.description',
		icon: 'life-buoy',
		gradient: { from: '#6D28D9', to: '#C4B5FD', angle: 135, fromStop: 0, toStop: 100 },
		config: {
			name: 'Support Inbox Triage',
			instructions: `You are the support triage assistant for a SaaS team. People ask you what is waiting in the inbox, what is urgent, whether the team is inside its SLA, and about single tickets. Answer in one or two plain sentences and show the data in a card — a list for "what's waiting", an email card for one ticket (the customer's last message is the preview), a number for SLA questions. Order by priority, then age. Call out SLA breaches explicitly. Never invent tickets or figures; the data below is the only source of truth.\n\n${SUPPORT_DEMO_DATA}`,
			cards: {
				tone: 'lavender',
				presets: [
					{
						name: 'Open tickets',
						type: 'list',
						useWhen: "the user asks what's waiting, what's urgent, or what to pick up next",
						fields:
							'items: title = "#id · subject", subtitle = requester + status, meta = priority or age (≤5 items); total: open count',
					},
					{
						name: 'Ticket',
						type: 'email',
						tone: 'paper',
						useWhen: 'the user asks about one ticket',
						fields:
							'direction: received; from: requester; to: ["support"]; subject: the ticket subject; preview: the last customer message; labels: priority and status',
					},
					{
						name: 'SLA health',
						type: 'metric',
						useWhen: 'the user asks about SLA, response times, or how the week is going',
						fields:
							'value: % replied within SLA; delta: vs last week; breakdown: within SLA vs breached; label: "within SLA this week"',
					},
				],
			},
		},
	},
	{
		id: 'workflow-health-reporter',
		labelKey: 'agents.builder.templates.workflowHealthReporter.label',
		descriptionKey: 'agents.builder.templates.workflowHealthReporter.description',
		icon: 'chart-bar',
		gradient: { from: '#166534', to: '#4ADE80', angle: 160, fromStop: 4, toStop: 96 },
		config: {
			name: 'Workflow Health Reporter',
			instructions: `You are the operations assistant watching a team's n8n workflows. People ask you how yesterday's runs went, what failed and why, and about a single workflow. Answer in one or two plain sentences and show the data in a card — a number with a breakdown for "how did it go", a list for failures, a key/value card for one workflow. Name the cause of a failure when the data has it and suggest the obvious next step in one short clause. Never invent runs or causes; the data below is the only source of truth.\n\n${WORKFLOW_HEALTH_DEMO_DATA}`,
			cards: {
				tone: 'forest',
				presets: [
					{
						name: 'Runs yesterday',
						type: 'metric',
						useWhen: 'the user asks how the runs went, how healthy things are, or for the daily summary',
						fields:
							'value: success rate or total runs; delta: vs the day before; breakdown: succeeded vs failed; trend: hourly failures; label: "runs yesterday"',
					},
					{
						name: 'Failed runs',
						type: 'list',
						tone: 'graphite',
						useWhen: 'the user asks what failed or what needs attention',
						fields:
							'items: title = workflow name, subtitle = cause, meta = time or count; status: error; total: failed count',
					},
					{
						name: 'Workflow detail',
						type: 'keyValue',
						useWhen: 'the user asks about one workflow',
						fields: 'pairs: Runs, Succeeded, Failed, Avg duration, Last failure',
					},
				],
			},
		},
	},
	{
		id: 'morning-news-brief',
		labelKey: 'agents.builder.templates.morningNewsBrief.label',
		descriptionKey: 'agents.builder.templates.morningNewsBrief.description',
		icon: 'sun',
		gradient: { from: '#F5A524', to: '#FF5A1F', angle: 160, fromStop: 8, toStop: 92 },
		config: {
			name: 'Morning News Brief',
			instructions:
				'You are a news brief agent. Every morning at 9am, search the web for today’s top headlines and compile a concise summary. For each story include a headline, a one-sentence summary, and a source link. Limit the brief to five stories.',
			config: {
				webSearch: { enabled: true, provider: 'native' },
			},
		},
		tasks: [
			{
				name: 'Morning news brief',
				objective:
					'Search the web for today’s top headlines and compile a concise summary. For each story include a headline, a one-sentence summary, and a source link. Limit the brief to five stories.',
				cronExpression: '0 9 * * *',
			},
		],
	},
	{
		id: 'process-incoming-emails',
		labelKey: 'agents.builder.templates.processIncomingEmails.label',
		descriptionKey: 'agents.builder.templates.processIncomingEmails.description',
		icon: 'mail',
		gradient: { from: '#2563EB', to: '#7C3AED', angle: 135, fromStop: 0, toStop: 100 },
		config: {
			name: 'Process Incoming Emails',
			instructions:
				'You are an email processing agent. Read new emails from Gmail, identify action items, and update the user’s Google Calendar with any meetings, deadlines, or follow-ups mentioned. Summarize each email and flag urgent items.',
			tools: [
				{
					type: 'node',
					name: 'Gmail',
					description: 'Read and send emails through Gmail.',
					node: {
						nodeType: 'n8n-nodes-base.gmail',
						nodeTypeVersion: 2,
						// `getAll` is valid with no extra fields. The default
						// `send` operation requires recipient, subject, and body,
						// and an invalid tool blocks every chat send.
						nodeParameters: { resource: 'message', operation: 'getAll' },
						credentials: { gmailOAuth2: { id: '', name: 'gmailOAuth2' } },
					},
				},
				{
					type: 'node',
					name: 'Google Calendar',
					description: 'Create and update calendar events.',
					node: {
						nodeType: 'n8n-nodes-base.googleCalendar',
						nodeTypeVersion: 1,
						// `create` requires start and end. Runtime values keep the
						// tool valid before a calendar is connected.
						nodeParameters: {
							resource: 'event',
							operation: 'create',
							start: "={{ $fromAI('start', 'Event start time', 'string') }}",
							end: "={{ $fromAI('end', 'Event end time', 'string') }}",
						},
						credentials: {
							googleCalendarOAuth2Api: { id: '', name: 'googleCalendarOAuth2Api' },
						},
					},
				},
			],
		},
	},
	{
		id: 'qualify-new-leads',
		labelKey: 'agents.builder.templates.qualifyNewLeads.label',
		descriptionKey: 'agents.builder.templates.qualifyNewLeads.description',
		icon: 'users',
		gradient: { from: '#059669', to: '#84CC16', angle: 120, fromStop: 4, toStop: 88 },
		config: {
			name: 'Qualify New Leads',
			instructions:
				'You are a lead qualification agent. Score new leads from the CRM based on their profile, activity, and engagement. Route high-scoring leads to sales for immediate follow-up, and nurture low-scoring leads with relevant content.',
		},
	},
	{
		id: 'propose-meeting-times',
		labelKey: 'agents.builder.templates.proposeMeetingTimes.label',
		descriptionKey: 'agents.builder.templates.proposeMeetingTimes.description',
		icon: 'calendar',
		gradient: { from: '#0F766E', to: '#2DD4BF', angle: 150, fromStop: 4, toStop: 96 },
		config: {
			name: 'Propose Meeting Times',
			instructions:
				'You are a scheduling agent. Find open slots on the user’s Google Calendar and suggest a few meeting times. Match the requested duration and time window. Do not book a meeting until the user confirms a time.',
			tools: [
				{
					type: 'node',
					name: 'Google Calendar',
					description: 'Find open slots on Google Calendar.',
					node: {
						nodeType: 'n8n-nodes-base.googleCalendar',
						nodeTypeVersion: 1.3,
						// Availability needs an interval. Runtime values keep the
						// tool valid before a calendar is connected.
						nodeParameters: {
							resource: 'calendar',
							operation: 'availability',
							timeMin: "={{ $fromAI('timeMin', 'Start of the interval to check', 'string') }}",
							timeMax: "={{ $fromAI('timeMax', 'End of the interval to check', 'string') }}",
						},
						credentials: {
							googleCalendarOAuth2Api: { id: '', name: 'googleCalendarOAuth2Api' },
						},
					},
				},
			],
		},
	},
];

/**
 * A blank agent: no instructions, no tools, and no channel integrations.
 * `name` and `model` are ignored — both are seeded on every new agent, so a
 * default name or model does not count as content the user would lose by
 * applying a template.
 */
export function isAgentConfigBlank(config: AgentJsonConfig): boolean {
	return (
		config.instructions.trim() === '' &&
		(config.tools?.length ?? 0) === 0 &&
		(config.integrations?.length ?? 0) === 0
	);
}

/**
 * Returns the config with the template written onto it, or `null` when the
 * agent already has content (instructions or tools). `name` is only replaced
 * while it still equals `defaultName` (the seeded "New Agent"), so a renamed
 * agent keeps its name. The template icon and gradient replace the
 * personalisation. `model` and every other field are preserved.
 */
export function applyAgentTemplate(
	config: AgentJsonConfig,
	template: AgentTemplate,
	defaultName: string,
): AgentJsonConfig | null {
	if (!isAgentConfigBlank(config)) return null;
	return {
		...config,
		name: config.name === defaultName ? template.config.name : config.name,
		instructions: template.config.instructions,
		tools: template.config.tools ?? [],
		integrations: template.config.integrations ?? [],
		config: { ...config.config, ...template.config.config },
		...(template.config.cards && { cards: template.config.cards }),
		personalisation: {
			icon: template.icon,
			gradient: { ...template.gradient },
		},
	};
}
