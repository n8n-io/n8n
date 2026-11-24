import type { IconName } from '@n8n/design-system';
import { isRecord } from '@n8n/utils/is-record';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

export interface AgentHeldAction {
	actionId: string;
	toolName: string;
	appName: string;
	actionLabel: string;
	target?: string;
	input?: unknown;
	icon: IconName;
	/** Node type of a known app, such as `n8n-nodes-base.gmail`. Used only to show its icon. */
	nodeType?: string;
}

const KNOWN_APP_NODE_TYPES: ReadonlyArray<{ pattern: RegExp; name: string; nodeType: string }> = [
	{ pattern: /\bgmail\b/, name: 'Gmail', nodeType: 'n8n-nodes-base.gmail' },
	{ pattern: /\boutlook\b/, name: 'Outlook', nodeType: 'n8n-nodes-base.microsoftOutlook' },
	{ pattern: /\bslack\b/, name: 'Slack', nodeType: 'n8n-nodes-base.slack' },
	{ pattern: /\bdiscord\b/, name: 'Discord', nodeType: 'n8n-nodes-base.discord' },
	{ pattern: /\bteams\b/, name: 'Microsoft Teams', nodeType: 'n8n-nodes-base.microsoftTeams' },
	{ pattern: /\btelegram\b/, name: 'Telegram', nodeType: 'n8n-nodes-base.telegram' },
	{ pattern: /\blinear\b/, name: 'Linear', nodeType: 'n8n-nodes-base.linear' },
	{ pattern: /\bjira\b/, name: 'Jira', nodeType: 'n8n-nodes-base.jira' },
	{ pattern: /\bgithub\b/, name: 'GitHub', nodeType: 'n8n-nodes-base.github' },
	{ pattern: /\bhubspot\b/, name: 'HubSpot', nodeType: 'n8n-nodes-base.hubspot' },
	{ pattern: /\bnotion\b/, name: 'Notion', nodeType: 'n8n-nodes-base.notion' },
	{ pattern: /\bairtable\b/, name: 'Airtable', nodeType: 'n8n-nodes-base.airtable' },
	{
		pattern: /\bgoogle ?sheets?\b/,
		name: 'Google Sheets',
		nodeType: 'n8n-nodes-base.googleSheets',
	},
	{
		pattern: /\bgoogle ?calendar\b/,
		name: 'Google Calendar',
		nodeType: 'n8n-nodes-base.googleCalendar',
	},
];

function inferKnownApp(toolName: string) {
	const normalized = toolName
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[_:-]+/g, ' ')
		.toLowerCase();
	return KNOWN_APP_NODE_TYPES.find(({ pattern }) => pattern.test(normalized));
}

const TARGET_KEYS = [
	'channel',
	'channelName',
	'to',
	'recipient',
	'email',
	'issueId',
	'issue',
	'identifier',
	'project',
	'team',
	'title',
	'subject',
	'sheet',
	'table',
	'database',
	'repository',
	'repo',
	'url',
	'id',
] as const;

function titleCase(value: string): string {
	return value
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function sentenceCase(value: string): string {
	const words = value
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.trim()
		.toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function inferAppAndAction(toolName: string): { appName: string; actionLabel: string } {
	// MCP or prefixed names: e.g. "linear__create_issue", "slack:post_message", "gmail_send_email"
	const doubleSep = toolName.split(/__|::|:/);
	if (doubleSep.length >= 2) {
		const [app, ...rest] = doubleSep;
		return {
			appName: titleCase(app),
			actionLabel: sentenceCase(rest.join(' ')),
		};
	}

	const parts = toolName.split('_').filter(Boolean);
	if (parts.length >= 2) {
		const [app, ...rest] = parts;
		return {
			appName: titleCase(app),
			actionLabel: sentenceCase(rest.join(' ')),
		};
	}

	const formatted = titleCase(toolName);
	return { appName: formatted, actionLabel: formatted };
}

function inferAppIcon(appName: string, toolName: string): IconName {
	const haystack = `${appName} ${toolName}`.toLowerCase();
	if (haystack.includes('mail') || haystack.includes('email') || haystack.includes('gmail')) {
		return 'mail';
	}
	if (
		haystack.includes('slack') ||
		haystack.includes('chat') ||
		haystack.includes('message') ||
		haystack.includes('telegram') ||
		haystack.includes('discord')
	) {
		return 'message-square';
	}
	if (
		haystack.includes('linear') ||
		haystack.includes('jira') ||
		haystack.includes('issue') ||
		haystack.includes('task') ||
		haystack.includes('ticket')
	) {
		return 'check-square';
	}
	if (haystack.includes('calendar') || haystack.includes('event') || haystack.includes('meeting')) {
		return 'calendar';
	}
	if (
		haystack.includes('sheet') ||
		haystack.includes('database') ||
		haystack.includes('postgres') ||
		haystack.includes('airtable') ||
		haystack.includes('notion')
	) {
		return 'database';
	}
	if (haystack.includes('http') || haystack.includes('webhook') || haystack.includes('web')) {
		return 'globe';
	}
	return 'send';
}

function extractTarget(input: unknown, fallbackSummary?: string): string | undefined {
	if (isRecord(input)) {
		for (const key of TARGET_KEYS) {
			const value = input[key];
			if (typeof value === 'string' && value.trim().length > 0) {
				return value.trim();
			}
			if (typeof value === 'number') {
				return String(value);
			}
		}
	}
	if (fallbackSummary && fallbackSummary.trim().length > 0) {
		return fallbackSummary.trim();
	}
	return undefined;
}

/**
 * A tool call is a held write when the simulation reported `world_write` evidence
 * (a send or change held in the simulated world rather than executed in real apps).
 */
export function isHeldWriteToolCall(toolCall: ToolCall): boolean {
	const simulation = toolCall.simulation;
	if (!simulation || simulation.route === 'blocked') return false;
	return simulation.evidence?.includes('world_write') === true;
}

export function extractHeldActions(toolCalls: readonly ToolCall[]): AgentHeldAction[] {
	return toolCalls.filter(isHeldWriteToolCall).map((toolCall) => {
		const { appName: inferredAppName, actionLabel } = inferAppAndAction(toolCall.tool);
		const knownApp = inferKnownApp(toolCall.tool);
		const appName = knownApp?.name ?? inferredAppName;
		return {
			actionId: toolCall.toolCallId,
			toolName: toolCall.tool,
			appName,
			actionLabel,
			target: extractTarget(toolCall.input, toolCall.displaySummary),
			input: toolCall.input,
			icon: inferAppIcon(appName, toolCall.tool),
			...(knownApp ? { nodeType: knownApp.nodeType } : {}),
		};
	});
}

// Objects that an action sends. Any other object is saved.
const SENT_OBJECTS: ReadonlySet<string> = new Set([
	'email',
	'mail',
	'message',
	'reply',
	'notification',
	'sms',
	'dm',
	'post',
]);
const SEND_VERBS: ReadonlySet<string> = new Set(['send', 'post', 'reply', 'forward', 'notify']);

/**
 * What an action makes or sends, in lower case: `email` for `Send email`, `row` for `Append row`.
 * An action without a verb and an object, such as a tool named after its app, is an `action`.
 */
export function actionObject(action: Pick<AgentHeldAction, 'actionLabel' | 'appName'>): string {
	const words = action.actionLabel.toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0 || action.actionLabel === action.appName) return 'action';
	return words[words.length - 1];
}

/** Whether a run action was sent (an email, a message) or saved (a row, a contact). */
export function actionOutcome(
	action: Pick<AgentHeldAction, 'actionLabel' | 'appName'>,
): 'sent' | 'saved' {
	const verb = action.actionLabel.toLowerCase().split(/\s+/)[0] ?? '';
	return SEND_VERBS.has(verb) || SENT_OBJECTS.has(actionObject(action)) ? 'sent' : 'saved';
}

export function formatPreviewEntries(input: unknown): Array<{ key: string; value: string }> {
	if (!isRecord(input)) {
		if (input === undefined || input === null) return [];
		return [{ key: 'Input', value: typeof input === 'string' ? input : JSON.stringify(input) }];
	}
	return Object.entries(input)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.map(([key, value]) => ({
			key: titleCase(key),
			value: typeof value === 'string' ? value : JSON.stringify(value),
		}));
}

export function formatCommitTime(isoTimestamp: string): string {
	const date = new Date(isoTimestamp);
	if (Number.isNaN(date.getTime())) return '';
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}
