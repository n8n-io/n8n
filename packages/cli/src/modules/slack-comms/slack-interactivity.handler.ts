import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import { UrlService } from '@/services/url.service';
import { UserService } from '@/services/user.service';

import { invitePromptBlocks, SLACK_ACTION_IDS } from './slack-blocks';
import { SlackIdentityService } from './slack-identity.service';
import type { SlackInstall } from './slack-install.provider';
import { SlackInstallProvider } from './slack-install.provider';
import { SlackRunRenderer, type SlackRunTarget } from './slack-runner.service';
import { SlackThreadRegistry } from './slack-thread-registry';
import { SlackWebClient } from './slack-web-client';

const INSTANCE_AI_MESSAGE_SCOPE = 'instanceAi:message';
const NOT_AUTHORIZED_TEXT = 'Only n8n users can act on this.';
const EXPIRED_TEXT = 'This request expired. Ask again if you still want it.';
const DEBUG_PROMPT = 'The execution failed. Look into what went wrong and help me fix it.';

interface ParsedBlockAction {
	actionId: string;
	value?: string;
	blockId?: string;
}

interface ParsedInteractivity {
	teamId: string;
	slackUserId: string;
	channelId: string;
	messageTs: string;
	actions: ParsedBlockAction[];
	stateValues: Record<string, Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
}

function parseInteractivity(body: unknown): ParsedInteractivity | undefined {
	if (!isRecord(body)) return undefined;

	const teamId = readString(record(body.team)?.id);
	const slackUserId = readString(record(body.user)?.id);
	const channelId = readString(record(body.channel)?.id);
	const messageTs = readString(record(body.message)?.ts);
	if (!teamId || !slackUserId || !channelId || !messageTs) return undefined;
	if (!Array.isArray(body.actions)) return undefined;

	const actions: ParsedBlockAction[] = [];
	for (const entry of body.actions) {
		if (!isRecord(entry)) continue;
		const actionId = readString(entry.action_id);
		if (!actionId) continue;
		actions.push({
			actionId,
			value: readString(entry.value),
			blockId: readString(entry.block_id),
		});
	}

	const rawValues = record(record(body.state)?.values);
	const stateValues: Record<string, Record<string, unknown>> = {};
	if (rawValues) {
		for (const [blockId, value] of Object.entries(rawValues)) {
			const asRecord = record(value);
			if (asRecord) stateValues[blockId] = asRecord;
		}
	}

	return { teamId, slackUserId, channelId, messageTs, actions, stateValues };
}

function extractCredentialSelections(
	stateValues: Record<string, Record<string, unknown>>,
): Record<string, string> {
	const credentials: Record<string, string> = {};
	const prefix = 'credential:';

	for (const [blockId, actions] of Object.entries(stateValues)) {
		if (!blockId.startsWith(prefix)) continue;
		const selection = record(actions.select);
		const selectedOption = record(selection?.selected_option);
		const value = readString(selectedOption?.value);
		if (value) credentials[blockId.slice(prefix.length)] = value;
	}

	return credentials;
}

function extractAnswers(
	stateValues: Record<string, Record<string, unknown>>,
): Array<{ questionId: string; selectedOptions: string[]; skipped?: boolean }> {
	const prefix = 'question:';
	const answers: Array<{ questionId: string; selectedOptions: string[]; skipped?: boolean }> = [];

	for (const [blockId, actions] of Object.entries(stateValues)) {
		if (!blockId.startsWith(prefix)) continue;
		const questionId = blockId.slice(prefix.length);
		const answer = record(actions.answer);

		if (Array.isArray(answer?.selected_options)) {
			const selectedOptions = answer.selected_options
				.map((option) => readString(record(option)?.value))
				.filter((value): value is string => value !== undefined);
			answers.push({ questionId, selectedOptions });
			continue;
		}

		const selectedOption = record(answer?.selected_option);
		const value = readString(selectedOption?.value);
		answers.push({
			questionId,
			selectedOptions: value ? [value] : [],
			skipped: value === undefined,
		});
	}

	return answers;
}

@Service()
export class SlackInteractivityHandler {
	constructor(
		private readonly installProvider: SlackInstallProvider,
		private readonly identity: SlackIdentityService,
		private readonly webClient: SlackWebClient,
		private readonly instanceAi: InstanceAiService,
		private readonly memory: InstanceAiMemoryService,
		private readonly projects: ProjectRepository,
		private readonly registry: SlackThreadRegistry,
		private readonly renderer: SlackRunRenderer,
		private readonly settings: InstanceAiSettingsService,
		private readonly userService: UserService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	async handle(body: unknown): Promise<void> {
		const install = this.installProvider.getInstall();
		if (!install) return;

		const parsed = parseInteractivity(body);
		if (!parsed) return;

		const action = parsed.actions[0];
		if (!action) return;

		const resolution = await this.identity.resolve(install.botToken, parsed.slackUserId);
		if (!resolution) {
			await this.webClient.postEphemeral(install.botToken, {
				channel: parsed.channelId,
				user: parsed.slackUserId,
				text: NOT_AUTHORIZED_TEXT,
			});
			return;
		}
		const { user, tz } = resolution;

		switch (action.actionId) {
			case SLACK_ACTION_IDS.approve:
				return await this.resolveAndUpdate(
					install,
					user,
					parsed,
					action,
					{ kind: 'approval', approved: true },
					`Turned on by <@${parsed.slackUserId}>.`,
				);
			case SLACK_ACTION_IDS.reject:
				return await this.resolveAndUpdate(
					install,
					user,
					parsed,
					action,
					{ kind: 'approval', approved: false },
					`Declined by <@${parsed.slackUserId}>. Nothing was changed.`,
				);
			case SLACK_ACTION_IDS.planApprove:
				return await this.resolveAndUpdate(
					install,
					user,
					parsed,
					action,
					{ kind: 'approval', approved: true },
					'Plan approved.',
				);
			case SLACK_ACTION_IDS.planRequestChanges:
				return await this.resolveAndUpdate(
					install,
					user,
					parsed,
					action,
					{ kind: 'approval', approved: false },
					'Asked for changes.',
				);
			case SLACK_ACTION_IDS.domainApprove:
				return await this.resolveAndUpdate(
					install,
					user,
					parsed,
					action,
					{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' },
					'Allowed.',
				);
			case SLACK_ACTION_IDS.domainDeny:
				return await this.resolveAndUpdate(
					install,
					user,
					parsed,
					action,
					{ kind: 'domainAccessDeny' },
					'Denied.',
				);
			case SLACK_ACTION_IDS.credentialSubmit:
				return await this.handleCredentialSubmit(install, user, parsed, action);
			case SLACK_ACTION_IDS.questionsSubmit:
				return await this.handleQuestionsSubmit(install, user, parsed, action);
			case SLACK_ACTION_IDS.debug:
				return await this.handleDebug(install, user, tz, parsed, action);
			case SLACK_ACTION_IDS.inviteUser:
				return await this.handleInviteUser(install, user, parsed, action);
			case SLACK_ACTION_IDS.inviteIgnore:
				return await this.handleInviteIgnore(install, parsed, action);
			case SLACK_ACTION_IDS.runWorkflow:
				return await this.handleRunWorkflow(install, parsed, action);
			default:
				return;
		}
	}

	private async handleCredentialSubmit(
		install: SlackInstall,
		user: User,
		parsed: ParsedInteractivity,
		action: ParsedBlockAction,
	): Promise<void> {
		const requestId = action.value;
		if (!requestId) return;
		const credentials = extractCredentialSelections(parsed.stateValues);
		if (Object.keys(credentials).length === 0) return;

		await this.resolveAndUpdate(
			install,
			user,
			parsed,
			action,
			{ kind: 'credentialSelection', credentials },
			'Credential set.',
		);
	}

	private async handleQuestionsSubmit(
		install: SlackInstall,
		user: User,
		parsed: ParsedInteractivity,
		action: ParsedBlockAction,
	): Promise<void> {
		const requestId = action.value;
		if (!requestId) return;
		const answers = extractAnswers(parsed.stateValues);
		if (answers.length === 0) return;

		await this.resolveAndUpdate(
			install,
			user,
			parsed,
			action,
			{ kind: 'questions', answers },
			'Thanks, got it.',
		);
	}

	private async handleDebug(
		install: SlackInstall,
		user: User,
		tz: string | null,
		parsed: ParsedInteractivity,
		action: ParsedBlockAction,
	): Promise<void> {
		const value = action.value;
		if (!value) return;
		const [workflowId, executionId] = value.split(':');
		if (!workflowId || !executionId) return;

		if (!this.isAuthorizedForRun(user)) {
			await this.webClient.postEphemeral(install.botToken, {
				channel: parsed.channelId,
				user: parsed.slackUserId,
				text: NOT_AUTHORIZED_TEXT,
			});
			return;
		}

		await this.webClient.postMessage(install.botToken, {
			channel: parsed.channelId,
			threadTs: parsed.messageTs,
			text: `Looking into run #${executionId} now.`,
		});

		const project = await this.projects.getPersonalProjectForUser(user.id);
		if (!project) return;

		const threadId = this.registry.threadIdFor(
			parsed.teamId,
			parsed.channelId,
			parsed.messageTs,
			user.id,
		);
		this.registry.subscribe(parsed.messageTs);

		await this.memory.ensureThread(user.id, threadId, project.id, {
			source: 'assistant_page',
			origin: 'external',
		});

		if (this.instanceAi.hasActiveRun(threadId)) return;

		const target: SlackRunTarget = {
			botToken: install.botToken,
			channelId: parsed.channelId,
			threadTs: parsed.messageTs,
			recipientUserId: parsed.slackUserId,
			recipientTeamId: parsed.teamId,
		};
		await this.renderer.attach(threadId, target);

		this.instanceAi.startRun(
			user,
			threadId,
			DEBUG_PROMPT,
			[{ type: 'workflow', id: workflowId, executionId }],
			undefined,
			tz ?? undefined,
		);
	}

	private async handleInviteUser(
		install: SlackInstall,
		user: User,
		parsed: ParsedInteractivity,
		action: ParsedBlockAction,
	): Promise<void> {
		const email = action.value;
		if (!email) return;

		if (user.role?.slug !== GLOBAL_OWNER_ROLE.slug) {
			await this.webClient.postEphemeral(install.botToken, {
				channel: parsed.channelId,
				user: parsed.slackUserId,
				text: 'Only an instance owner can send this invite.',
			});
			return;
		}

		try {
			await this.userService.inviteUsers(user, [{ email, role: GLOBAL_MEMBER_ROLE.slug }]);
			await this.webClient.updateMessage(install.botToken, {
				channel: parsed.channelId,
				ts: parsed.messageTs,
				text: `Invited ${email}.`,
				blocks: invitePromptBlocks({
					requesterName: email,
					requesterEmail: email,
					channelName: '',
					resolution: 'invited',
				}),
			});
		} catch (error) {
			this.logger.warn('Slack interactivity handler failed to invite a user', { error });
		}
	}

	private async handleInviteIgnore(
		install: SlackInstall,
		parsed: ParsedInteractivity,
		action: ParsedBlockAction,
	): Promise<void> {
		const email = action.value ?? '';
		await this.webClient.updateMessage(install.botToken, {
			channel: parsed.channelId,
			ts: parsed.messageTs,
			text: 'Ignored.',
			blocks: invitePromptBlocks({
				requesterName: email,
				requesterEmail: email,
				channelName: '',
				resolution: 'ignored',
			}),
		});
	}

	private async handleRunWorkflow(
		install: SlackInstall,
		parsed: ParsedInteractivity,
		action: ParsedBlockAction,
	): Promise<void> {
		const workflowId = action.value;
		if (!workflowId) return;

		await this.webClient.postMessage(install.botToken, {
			channel: parsed.channelId,
			threadTs: parsed.messageTs,
			text: `Open in n8n to run it: ${this.urlService.getInstanceBaseUrl()}/workflow/${workflowId}`,
		});
	}

	private isAuthorizedForRun(user: User): boolean {
		if (!this.settings.isInstanceAiEnabled()) return false;
		return user.role?.scopes?.some((scope) => scope.slug === INSTANCE_AI_MESSAGE_SCOPE) ?? false;
	}

	private async resolveAndUpdate(
		install: SlackInstall,
		user: User,
		parsed: ParsedInteractivity,
		action: ParsedBlockAction,
		request: InstanceAiConfirmRequest,
		successText: string,
	): Promise<void> {
		const requestId = action.value;
		if (!requestId) return;

		try {
			const result = await this.instanceAi.resolveConfirmation(user.id, requestId, request);
			const text = result ? successText : EXPIRED_TEXT;
			await this.webClient.updateMessage(install.botToken, {
				channel: parsed.channelId,
				ts: parsed.messageTs,
				text,
				blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
			});
		} catch (error) {
			if (!(error instanceof UserError)) throw error;
			await this.webClient.updateMessage(install.botToken, {
				channel: parsed.channelId,
				ts: parsed.messageTs,
				text: EXPIRED_TEXT,
				blocks: [{ type: 'section', text: { type: 'mrkdwn', text: EXPIRED_TEXT } }],
			});
		}
	}
}
