import type { Logger } from '@n8n/backend-common';
import type { User, UserRepository } from '@n8n/db';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import {
	SlackErrorNotificationEventRelay,
	SlackInviteNotifier,
} from '../slack-error-notification.event-relay';
import type { SlackInstallProvider } from '../slack-install.provider';
import type { SlackUnmatchedMentionContext } from '../slack-runner.service';
import type { SlackWebClient } from '../slack-web-client';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

function baseEvent(
	overrides: Partial<RelayEventMap['workflow-post-execute']> = {},
): RelayEventMap['workflow-post-execute'] {
	return {
		executionId: 'exec-1',
		workflow: mock<IWorkflowBase>({ id: 'wf-1', name: 'My Workflow' }),
		runData: mock<IRun>({
			status: 'success',
			data: { resultData: {} },
		} as never) as unknown as IRun,
		...overrides,
	};
}

function errorRunData(message: string, status: 'error' | 'crashed' = 'error'): IRun {
	return mock<IRun>({
		status,
		stoppedAt: new Date('2026-08-12T10:00:00.000Z'),
		data: {
			resultData: {
				error: { node: mock<INode>({ type: 'someType' }), message },
			},
		},
	} as never) as unknown as IRun;
}

describe('SlackErrorNotificationEventRelay', () => {
	const installProvider = mock<SlackInstallProvider>();
	const webClient = mock<SlackWebClient>();
	const logger = mock<Logger>();
	const eventService = new EventService();

	beforeEach(() => {
		vi.clearAllMocks();
		new SlackErrorNotificationEventRelay(eventService, installProvider, webClient, logger).init();
		installProvider.getInstall.mockReturnValue({
			botToken: 'x',
			botUserId: 'B1',
			errorChannelId: 'C_OPS',
		});
	});

	it('posts an error card to the configured channel when a run errors', async () => {
		eventService.emit('workflow-post-execute', baseEvent({ runData: errorRunData('boom') }));
		await flushPromises();

		expect(webClient.postMessage).toHaveBeenCalledWith(
			'x',
			expect.objectContaining({ channel: 'C_OPS' }),
		);
		const [, args] = webClient.postMessage.mock.calls[0];
		expect(JSON.stringify(args.blocks)).toContain('/workflow/wf-1/executions/exec-1');
		expect(JSON.stringify(args.blocks)).toContain('boom');
	});

	it('also fires for a crashed run', async () => {
		eventService.emit(
			'workflow-post-execute',
			baseEvent({ runData: errorRunData('crash', 'crashed') }),
		);
		await flushPromises();

		expect(webClient.postMessage).toHaveBeenCalled();
	});

	it('stays silent on a successful run', async () => {
		eventService.emit('workflow-post-execute', baseEvent());
		await flushPromises();

		expect(webClient.postMessage).not.toHaveBeenCalled();
	});

	it('stays silent when no error channel is configured', async () => {
		installProvider.getInstall.mockReturnValue({
			botToken: 'x',
			botUserId: 'B1',
			errorChannelId: null,
		});
		eventService.emit('workflow-post-execute', baseEvent({ runData: errorRunData('boom') }));
		await flushPromises();

		expect(webClient.postMessage).not.toHaveBeenCalled();
	});

	it('never throws even when the Slack call fails', async () => {
		webClient.postMessage.mockRejectedValue(new Error('network down'));

		eventService.emit('workflow-post-execute', baseEvent({ runData: errorRunData('boom') }));
		await flushPromises();

		expect(logger.warn).toHaveBeenCalledWith(
			'Slack error notification relay failed',
			expect.objectContaining({ error: expect.anything() }),
		);
	});
});

describe('SlackInviteNotifier', () => {
	const installProvider = mock<SlackInstallProvider>();
	const userRepository = mock<UserRepository>();
	const webClient = mock<SlackWebClient>();
	const logger = mock<Logger>();

	let notifier: SlackInviteNotifier;

	function context(
		overrides: Partial<SlackUnmatchedMentionContext> = {},
	): SlackUnmatchedMentionContext {
		return {
			slackUserId: 'U1',
			teamId: 'T1',
			channelId: 'C1',
			threadTs: '1.1',
			email: 'mara@acme.com',
			...overrides,
		};
	}

	beforeEach(() => {
		vi.resetAllMocks();
		notifier = new SlackInviteNotifier(installProvider, userRepository, webClient, logger);
		installProvider.getInstall.mockReturnValue({
			botToken: 'x',
			botUserId: 'B1',
			errorChannelId: null,
		});
		userRepository.findOne.mockResolvedValue(
			mock<User>({ id: 'owner-1', email: 'owner@acme.com' }),
		);
		webClient.lookupUserByEmail.mockResolvedValue('U_OWNER');
		webClient.openDm.mockResolvedValue('D1');
	});

	it('DMs the first n8n owner with an invite prompt', async () => {
		await notifier.notify(context());

		expect(userRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({ where: { role: { slug: 'global:owner' } } }),
		);
		expect(webClient.lookupUserByEmail).toHaveBeenCalledWith('x', 'owner@acme.com');
		expect(webClient.openDm).toHaveBeenCalledWith('x', 'U_OWNER');
		expect(webClient.postMessage).toHaveBeenCalledWith(
			'x',
			expect.objectContaining({ channel: 'D1', blocks: expect.anything() }),
		);
	});

	it('skips the DM when no owner exists', async () => {
		userRepository.findOne.mockResolvedValue(null);
		await notifier.notify(context());

		expect(webClient.lookupUserByEmail).not.toHaveBeenCalled();
		expect(webClient.postMessage).not.toHaveBeenCalled();
	});

	it('skips the DM when the owner has no Slack account', async () => {
		webClient.lookupUserByEmail.mockResolvedValue(null);
		await notifier.notify(context());

		expect(webClient.openDm).not.toHaveBeenCalled();
		expect(webClient.postMessage).not.toHaveBeenCalled();
	});

	it('does not notify twice for the same requester email', async () => {
		await notifier.notify(context());
		await notifier.notify(context());

		expect(webClient.postMessage).toHaveBeenCalledTimes(1);
	});

	it('dedupes by Slack user id when the requester has no email', async () => {
		await notifier.notify(context({ email: null }));
		await notifier.notify(context({ email: null }));

		expect(webClient.postMessage).toHaveBeenCalledTimes(1);
	});

	it('does nothing when Slack is not configured', async () => {
		installProvider.getInstall.mockReturnValue(null);
		await notifier.notify(context());

		expect(userRepository.findOne).not.toHaveBeenCalled();
	});

	it('never throws when a Slack call fails', async () => {
		webClient.openDm.mockRejectedValue(new Error('boom'));
		await expect(notifier.notify(context())).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalled();
	});
});
