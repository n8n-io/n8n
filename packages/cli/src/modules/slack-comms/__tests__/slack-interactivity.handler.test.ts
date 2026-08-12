import type { InstanceAiEnsureThreadResponse } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { Project, ProjectRepository, Role, Scope, User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import type { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import type { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import type { UrlService } from '@/services/url.service';
import type { UserService } from '@/services/user.service';

import { SLACK_ACTION_IDS } from '../slack-blocks';
import type { SlackIdentityResolution, SlackIdentityService } from '../slack-identity.service';
import type { SlackInstallProvider } from '../slack-install.provider';
import { SlackInteractivityHandler } from '../slack-interactivity.handler';
import type { SlackRunRenderer } from '../slack-runner.service';
import type { SlackThreadRegistry } from '../slack-thread-registry';
import type { SlackWebClient } from '../slack-web-client';

function interactivity(over: {
	actionId: string;
	value?: string;
	blockId?: string;
	stateValues?: Record<string, Record<string, unknown>>;
	slackUserId?: string;
}): unknown {
	return {
		team: { id: 'T1' },
		user: { id: over.slackUserId ?? 'U1' },
		channel: { id: 'C1' },
		message: { ts: '1.1' },
		actions: [{ action_id: over.actionId, value: over.value, block_id: over.blockId }],
		state: { values: over.stateValues ?? {} },
	};
}

function buildRole(overrides: Partial<Role> = {}): Role {
	return mock<Role>({
		slug: 'global:member',
		scopes: [mock<Scope>({ slug: 'instanceAi:message' })],
		...overrides,
	});
}

function buildUser(overrides: Partial<User> = {}): User {
	return mock<User>({ id: 'u1', disabled: false, role: buildRole(), ...overrides });
}

function buildResolution(overrides: Partial<User> = {}): SlackIdentityResolution {
	return { user: buildUser(overrides), tz: null };
}

function ensureThreadResponse(): InstanceAiEnsureThreadResponse {
	return {
		thread: {
			id: 'uuid-1',
			resourceId: 'u1',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		},
		created: false,
	};
}

describe('SlackInteractivityHandler', () => {
	const installProvider = mock<SlackInstallProvider>();
	const identity = mock<SlackIdentityService>();
	const webClient = mock<SlackWebClient>();
	const instanceAi = mock<InstanceAiService>();
	const memory = mock<InstanceAiMemoryService>();
	const projects = mock<ProjectRepository>();
	const registry = mock<SlackThreadRegistry>();
	const renderer = mock<SlackRunRenderer>();
	const settings = mock<InstanceAiSettingsService>();
	const userService = mock<UserService>();
	const urlService = mock<UrlService>();
	const logger = mock<Logger>();

	let handler: SlackInteractivityHandler;

	beforeEach(() => {
		vi.resetAllMocks();
		handler = new SlackInteractivityHandler(
			installProvider,
			identity,
			webClient,
			instanceAi,
			memory,
			projects,
			registry,
			renderer,
			settings,
			userService,
			urlService,
			logger,
		);

		installProvider.getInstall.mockReturnValue({
			botToken: 'x',
			botUserId: 'B1',
			errorChannelId: null,
		});
		identity.resolve.mockResolvedValue(buildResolution());
		instanceAi.resolveConfirmation.mockResolvedValue({ ok: true });
		instanceAi.hasActiveRun.mockReturnValue(false);
		settings.isInstanceAiEnabled.mockReturnValue(true);
		projects.getPersonalProjectForUser.mockResolvedValue(mock<Project>({ id: 'p1' }));
		registry.threadIdFor.mockReturnValue('uuid-1');
		memory.ensureThread.mockResolvedValue(ensureThreadResponse());
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
	});

	it('does nothing when Slack is not configured', async () => {
		installProvider.getInstall.mockReturnValue(null);
		await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.approve, value: 'req1' }));
		expect(identity.resolve).not.toHaveBeenCalled();
	});

	it('does nothing for an unparseable body', async () => {
		await handler.handle({});
		expect(identity.resolve).not.toHaveBeenCalled();
	});

	it('refuses silently plus an ephemeral note when the clicker is unmatched', async () => {
		identity.resolve.mockResolvedValue(null);
		await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.approve, value: 'req1' }));

		expect(webClient.postEphemeral).toHaveBeenCalledWith(
			'x',
			expect.objectContaining({
				channel: 'C1',
				user: 'U1',
				text: 'Only n8n users can act on this.',
			}),
		);
		expect(instanceAi.resolveConfirmation).not.toHaveBeenCalled();
	});

	it('ignores a bare select change', async () => {
		await handler.handle(interactivity({ actionId: 'select', value: undefined }));
		expect(instanceAi.resolveConfirmation).not.toHaveBeenCalled();
		expect(webClient.updateMessage).not.toHaveBeenCalled();
	});

	describe('approval', () => {
		it('turns the request on and marks the card', async () => {
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.approve, value: 'req1' }));

			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'approval',
				approved: true,
			});
			expect(webClient.updateMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({ channel: 'C1', ts: '1.1', text: 'Turned on by <@U1>.' }),
			);
		});

		it('declines the request and marks the card', async () => {
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.reject, value: 'req1' }));

			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'approval',
				approved: false,
			});
			expect(webClient.updateMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({ text: 'Declined by <@U1>. Nothing was changed.' }),
			);
		});

		it('rewrites the card inert when the confirmation is stale (null)', async () => {
			instanceAi.resolveConfirmation.mockResolvedValue(null);
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.approve, value: 'req1' }));

			expect(webClient.updateMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({
					text: 'This request expired. Ask again if you still want it.',
				}),
			);
		});

		it('rewrites the card inert the same way when the confirmation has expired', async () => {
			instanceAi.resolveConfirmation.mockRejectedValue(
				new UserError('This confirmation has expired.'),
			);

			await expect(
				handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.approve, value: 'req1' })),
			).resolves.toBeUndefined();

			expect(webClient.updateMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({
					text: 'This request expired. Ask again if you still want it.',
				}),
			);
		});

		it('does not swallow an unexpected error', async () => {
			instanceAi.resolveConfirmation.mockRejectedValue(new Error('boom'));
			await expect(
				handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.approve, value: 'req1' })),
			).rejects.toThrow('boom');
		});

		it('does nothing when the action carries no request id', async () => {
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.approve, value: undefined }));
			expect(instanceAi.resolveConfirmation).not.toHaveBeenCalled();
		});
	});

	describe('plan review', () => {
		it('approves the plan', async () => {
			await handler.handle(
				interactivity({ actionId: SLACK_ACTION_IDS.planApprove, value: 'req1' }),
			);
			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'approval',
				approved: true,
			});
		});

		it('asks for changes', async () => {
			await handler.handle(
				interactivity({ actionId: SLACK_ACTION_IDS.planRequestChanges, value: 'req1' }),
			);
			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'approval',
				approved: false,
			});
		});
	});

	describe('domain access', () => {
		it('approves domain access once', async () => {
			await handler.handle(
				interactivity({ actionId: SLACK_ACTION_IDS.domainApprove, value: 'req1' }),
			);
			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'domainAccessApprove',
				domainAccessAction: 'allow_once',
			});
		});

		it('denies domain access', async () => {
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.domainDeny, value: 'req1' }));
			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'domainAccessDeny',
			});
		});
	});

	describe('credential submit', () => {
		it('reads the block-scoped static_select and resolves credentialSelection', async () => {
			await handler.handle(
				interactivity({
					actionId: SLACK_ACTION_IDS.credentialSubmit,
					value: 'req1',
					stateValues: {
						'credential:slackApi': { select: { selected_option: { value: 'cred1' } } },
					},
				}),
			);

			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'credentialSelection',
				credentials: { slackApi: 'cred1' },
			});
		});

		it('does nothing when nothing was selected', async () => {
			await handler.handle(
				interactivity({ actionId: SLACK_ACTION_IDS.credentialSubmit, value: 'req1' }),
			);
			expect(instanceAi.resolveConfirmation).not.toHaveBeenCalled();
		});
	});

	describe('questions submit', () => {
		it('collects single and multi answers from state values', async () => {
			await handler.handle(
				interactivity({
					actionId: SLACK_ACTION_IDS.questionsSubmit,
					value: 'req1',
					stateValues: {
						'question:q1': { answer: { selected_option: { value: 'a' } } },
						'question:q2': {
							answer: { selected_options: [{ value: 'x' }, { value: 'y' }] },
						},
					},
				}),
			);

			expect(instanceAi.resolveConfirmation).toHaveBeenCalledWith('u1', 'req1', {
				kind: 'questions',
				answers: [
					{ questionId: 'q1', selectedOptions: ['a'], skipped: false },
					{ questionId: 'q2', selectedOptions: ['x', 'y'] },
				],
			});
		});
	});

	describe('debug this run', () => {
		it('acknowledges immediately, ensures a bound thread and starts a debug run', async () => {
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.debug, value: 'wf1:exec1' }));

			expect(webClient.postMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({ text: 'Looking into run #exec1 now.', threadTs: '1.1' }),
			);
			expect(memory.ensureThread).toHaveBeenCalledWith('u1', 'uuid-1', 'p1', {
				source: 'assistant_page',
				origin: 'external',
			});
			expect(renderer.attach.mock.invocationCallOrder[0]).toBeLessThan(
				instanceAi.startRun.mock.invocationCallOrder[0],
			);
			expect(instanceAi.startRun).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'u1' }),
				'uuid-1',
				'The execution failed. Look into what went wrong and help me fix it.',
				[{ type: 'workflow', id: 'wf1', executionId: 'exec1' }],
				undefined,
				undefined,
			);
		});

		it('refuses when the clicker lacks the instanceAi:message scope', async () => {
			identity.resolve.mockResolvedValue(buildResolution({ role: buildRole({ scopes: [] }) }));
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.debug, value: 'wf1:exec1' }));

			expect(webClient.postEphemeral).toHaveBeenCalled();
			expect(instanceAi.startRun).not.toHaveBeenCalled();
		});

		it('does not start a run when one is already active on that thread', async () => {
			instanceAi.hasActiveRun.mockReturnValue(true);
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.debug, value: 'wf1:exec1' }));

			expect(webClient.postMessage).toHaveBeenCalled();
			expect(instanceAi.startRun).not.toHaveBeenCalled();
		});
	});

	describe('invite flow', () => {
		it('lets an owner send the invite and rewrites the DM inert', async () => {
			identity.resolve.mockResolvedValue(
				buildResolution({ role: buildRole({ slug: 'global:owner' }) }),
			);

			await handler.handle(
				interactivity({ actionId: SLACK_ACTION_IDS.inviteUser, value: 'mara@acme.com' }),
			);

			expect(userService.inviteUsers).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), [
				{ email: 'mara@acme.com', role: 'global:member' },
			]);
			expect(webClient.updateMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({ text: 'Invited mara@acme.com.' }),
			);
		});

		it('refuses to issue an invite when the clicker is not an owner', async () => {
			identity.resolve.mockResolvedValue(
				buildResolution({ role: buildRole({ slug: 'global:member' }) }),
			);

			await handler.handle(
				interactivity({ actionId: SLACK_ACTION_IDS.inviteUser, value: 'mara@acme.com' }),
			);

			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});

		it('rewrites the DM inert on ignore', async () => {
			await handler.handle(
				interactivity({ actionId: SLACK_ACTION_IDS.inviteIgnore, value: 'mara@acme.com' }),
			);

			expect(webClient.updateMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({ text: 'Ignored.' }),
			);
		});
	});

	describe('run workflow', () => {
		it('posts a deep link to run the workflow in n8n', async () => {
			await handler.handle(interactivity({ actionId: SLACK_ACTION_IDS.runWorkflow, value: 'wf1' }));

			expect(webClient.postMessage).toHaveBeenCalledWith(
				'x',
				expect.objectContaining({
					text: 'Open in n8n to run it: https://n8n.example.com/workflow/wf1',
					threadTs: '1.1',
				}),
			);
		});
	});
});
