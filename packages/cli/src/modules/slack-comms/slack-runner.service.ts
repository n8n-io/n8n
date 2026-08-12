import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';

import { SlackIdentityService } from './slack-identity.service';
import type { SlackInstall } from './slack-install.provider';
import { SlackInstallProvider } from './slack-install.provider';
import { SlackThreadRegistry } from './slack-thread-registry';
import type { SlackThreadMessage } from './slack-web-client';
import { SlackWebClient } from './slack-web-client';

const SLACK_HISTORY_MAX_MESSAGE_CHARS = 1500;
const SLACK_HISTORY_LIMIT = 50;
const INSTANCE_AI_MESSAGE_SCOPE = 'instanceAi:message';

export interface SlackRunTarget {
	botToken: string;
	channelId: string;
	threadTs: string;
	recipientUserId: string;
	recipientTeamId: string;
}

export interface SlackRunRenderer {
	attach(threadId: string, target: SlackRunTarget): Promise<void>;
}

export interface SlackUnmatchedMentionContext {
	slackUserId: string;
	teamId: string;
	channelId: string;
	threadTs: string;
	email: string | null;
}

type SlackDispatchKind = 'dm' | 'mention' | 'channel';

type SlackDispatch =
	| { action: 'ignore' }
	| { action: 'drop' }
	| {
			action: 'run';
			kind: SlackDispatchKind;
			threadTs: string;
			authorSlackUserId: string;
	  };

interface ParsedSlackEvent {
	type: string;
	user?: string;
	botId?: string;
	channel: string;
	channelType?: string;
	ts: string;
	threadTs?: string;
	text: string;
	subtype?: string;
}

interface ParsedSlackEnvelope {
	teamId: string;
	event: ParsedSlackEvent;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function parseSlackEnvelope(body: unknown): ParsedSlackEnvelope | undefined {
	if (!isRecord(body) || !isRecord(body.event)) return undefined;

	const teamId = readString(body.team_id);
	const type = readString(body.event.type);
	const channel = readString(body.event.channel);
	const ts = readString(body.event.ts);
	if (!teamId || !type || !channel || !ts) return undefined;

	return {
		teamId,
		event: {
			type,
			user: readString(body.event.user),
			botId: readString(body.event.bot_id),
			channel,
			channelType: readString(body.event.channel_type),
			ts,
			threadTs: readString(body.event.thread_ts),
			text: readString(body.event.text) ?? '',
			subtype: readString(body.event.subtype),
		},
	};
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionPattern(userId: string, flags: string): RegExp {
	return new RegExp(`<@!?${escapeRegExp(userId)}(?:\\|[^>]+)?>`, flags);
}

function textMentionsUser(text: string, userId: string): boolean {
	return mentionPattern(userId, 'i').test(text);
}

function stripBotMentions(text: string, userId: string): string {
	return text.replace(mentionPattern(userId, 'gi'), '').replace(/\s+/g, ' ').trim();
}

function sanitizeSlackHistoryText(text: string): string {
	return text.replace(
		/<(\/?)(slack_thread_history)\s*>/gi,
		(_match, slash: string, name: string) => `[${slash}${name}]`,
	);
}

function truncateSlackHistoryMessage(text: string): string {
	const safe = sanitizeSlackHistoryText(text);
	return safe.length > SLACK_HISTORY_MAX_MESSAGE_CHARS
		? `${safe.slice(0, SLACK_HISTORY_MAX_MESSAGE_CHARS)}…`
		: safe;
}

function buildSlackHistoryTranscript(messages: SlackThreadMessage[]): string {
	const lines = messages.map((message) => {
		const author = message.userId ?? message.botId ?? 'unknown';
		return `[${author}]: ${truncateSlackHistoryMessage(message.text)}`;
	});
	return `<slack_thread_history>\n${lines.join('\n')}\n</slack_thread_history>`;
}

function unmatchedAccountText(email: string | null): string {
	return email
		? `I couldn't find an n8n account for ${email} on this instance. Ask your admin to invite you.`
		: "I couldn't find an n8n account for your Slack profile on this instance. Ask your admin to invite you.";
}

const GENERIC_FAILURE_TEXT =
	'Something went wrong on my side. Nothing in your instance was changed.';

@Service()
export class SlackRunner {
	private readonly refusedSlackUserIds = new Set<string>();

	constructor(
		private readonly installProvider: SlackInstallProvider,
		private readonly identity: SlackIdentityService,
		private readonly registry: SlackThreadRegistry,
		private readonly webClient: SlackWebClient,
		private readonly renderer: SlackRunRenderer,
		private readonly instanceAi: InstanceAiService,
		private readonly memory: InstanceAiMemoryService,
		private readonly projects: ProjectRepository,
		private readonly settings: InstanceAiSettingsService,
		private readonly logger: Logger,
		private readonly onUnmatchedMention?: (
			context: SlackUnmatchedMentionContext,
		) => Promise<void> | void,
	) {}

	async handle(body: unknown): Promise<void> {
		const install = this.installProvider.getInstall();
		if (!install) return;

		const parsed = parseSlackEnvelope(body);
		if (!parsed) return;

		const dispatch = this.classify(parsed.event, install.botUserId);
		if (dispatch.action !== 'run') return;

		const channelId = parsed.event.channel;
		this.registry.subscribe(dispatch.threadTs);

		try {
			await this.run(install, parsed.teamId, parsed.event, dispatch, channelId);
		} catch (error) {
			this.logger.warn('Slack runner failed to process an event', { error });
			await this.postGenericFailure(install, channelId, dispatch.threadTs);
		}
	}

	private classify(event: ParsedSlackEvent, botUserId: string): SlackDispatch {
		if (event.subtype !== undefined) return { action: 'ignore' };
		if (event.botId !== undefined) return { action: 'ignore' };
		if (event.user === undefined || event.user === botUserId) return { action: 'ignore' };

		const threadTs = event.threadTs ?? event.ts;

		if (event.type === 'app_mention') {
			return { action: 'run', kind: 'mention', threadTs, authorSlackUserId: event.user };
		}

		if (event.type !== 'message') return { action: 'ignore' };

		const isDirectMessage = event.channelType === 'im' || event.channel.startsWith('D');
		if (isDirectMessage) {
			return { action: 'run', kind: 'dm', threadTs, authorSlackUserId: event.user };
		}

		if (textMentionsUser(event.text, botUserId)) return { action: 'drop' };
		if (!this.registry.isSubscribed(threadTs)) return { action: 'ignore' };

		return { action: 'run', kind: 'channel', threadTs, authorSlackUserId: event.user };
	}

	private async run(
		install: SlackInstall,
		teamId: string,
		event: ParsedSlackEvent,
		dispatch: Extract<SlackDispatch, { action: 'run' }>,
		channelId: string,
	): Promise<void> {
		const resolution = await this.resolveAuthorizedUser(
			install.botToken,
			dispatch.authorSlackUserId,
		);
		if (!resolution) {
			await this.refuseUnauthorized(install, teamId, dispatch, channelId);
			return;
		}
		const { user, tz } = resolution;

		if (!this.settings.isInstanceAiEnabled()) return;

		const prompt = stripBotMentions(event.text, install.botUserId);
		if (prompt.length === 0) return;

		const project = await this.projects.getPersonalProjectForUser(user.id);
		if (!project) {
			this.logger.warn('Slack runner could not resolve a personal project for the matched user', {
				userId: user.id,
			});
			await this.postGenericFailure(install, channelId, dispatch.threadTs);
			return;
		}

		const threadId = this.registry.threadIdFor(teamId, channelId, dispatch.threadTs, user.id);
		const { created } = await this.memory.ensureThread(user.id, threadId, project.id, {
			source: 'assistant_page',
			origin: 'external',
		});

		let finalPrompt = prompt;
		if (
			created &&
			dispatch.kind === 'mention' &&
			event.threadTs !== undefined &&
			event.threadTs !== event.ts
		) {
			finalPrompt = await this.withHistoryBackfill(
				install.botToken,
				channelId,
				event.threadTs,
				prompt,
			);
		}

		if (this.instanceAi.hasActiveRun(threadId)) {
			const status = this.instanceAi.getThreadStatus(threadId);
			await this.webClient.postMessage(install.botToken, {
				channel: channelId,
				threadTs: dispatch.threadTs,
				text: status.isSuspended
					? 'Waiting for an approval above.'
					: 'Still working on the last one.',
			});
			return;
		}

		await this.renderer.attach(threadId, {
			botToken: install.botToken,
			channelId,
			threadTs: dispatch.threadTs,
			recipientUserId: dispatch.authorSlackUserId,
			recipientTeamId: teamId,
		});

		this.instanceAi.startRun(
			user,
			threadId,
			finalPrompt,
			undefined,
			undefined,
			tz ?? undefined,
			undefined,
		);
	}

	private async resolveAuthorizedUser(
		botToken: string,
		slackUserId: string,
	): Promise<{ user: User; tz: string | null } | null> {
		const resolution = await this.identity.resolve(botToken, slackUserId);
		if (!resolution || resolution.user.disabled) return null;
		const hasInstanceAiMessageScope =
			resolution.user.role?.scopes?.some((scope) => scope.slug === INSTANCE_AI_MESSAGE_SCOPE) ??
			false;
		return hasInstanceAiMessageScope ? resolution : null;
	}

	private async refuseUnauthorized(
		install: SlackInstall,
		teamId: string,
		dispatch: Extract<SlackDispatch, { action: 'run' }>,
		channelId: string,
	): Promise<void> {
		if (dispatch.kind === 'channel') return;
		if (this.refusedSlackUserIds.has(dispatch.authorSlackUserId)) return;
		this.refusedSlackUserIds.add(dispatch.authorSlackUserId);

		let email: string | null = null;
		try {
			email = await this.webClient.getUserEmail(install.botToken, dispatch.authorSlackUserId);
		} catch {}

		await this.webClient.postEphemeral(install.botToken, {
			channel: channelId,
			user: dispatch.authorSlackUserId,
			text: unmatchedAccountText(email),
		});

		if (this.onUnmatchedMention) {
			await this.onUnmatchedMention({
				slackUserId: dispatch.authorSlackUserId,
				teamId,
				channelId,
				threadTs: dispatch.threadTs,
				email,
			});
		}
	}

	private async postGenericFailure(
		install: SlackInstall,
		channelId: string,
		threadTs: string,
	): Promise<void> {
		try {
			await this.webClient.postMessage(install.botToken, {
				channel: channelId,
				threadTs,
				text: GENERIC_FAILURE_TEXT,
			});
		} catch {}
	}

	private async withHistoryBackfill(
		botToken: string,
		channelId: string,
		threadTs: string,
		prompt: string,
	): Promise<string> {
		const messages = await this.webClient.fetchThreadHistory(botToken, {
			channel: channelId,
			threadTs,
			limit: SLACK_HISTORY_LIMIT,
		});
		if (messages.length === 0) return prompt;
		return `${buildSlackHistoryTranscript(messages)}\n\n${prompt}`;
	}
}
