import type { BaseTextKey } from '@n8n/i18n';
import type {
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
	};
	/** Scheduled task bodies to create after the agent is persisted. The
	 * backend assigns each task an id and adds the matching `{ type: 'task',
	 * id, enabled }` ref to the config, so the template does not pre-populate
	 * the config's `tasks` array. */
	tasks?: AgentTaskConfig[];
}

/** Distinct from the home-screen suggestion catalog (`v1`). */
export const AGENT_TEMPLATE_SUGGESTIONS_VERSION = 'agent-templates-v1';

export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
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
		personalisation: {
			icon: template.icon,
			gradient: { ...template.gradient },
		},
	};
}
