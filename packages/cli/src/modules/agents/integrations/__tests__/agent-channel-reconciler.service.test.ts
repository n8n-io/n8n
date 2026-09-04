import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Agent } from '../../entities/agent.entity';
import type { AgentChannelStatus } from '../../entities/agent-channel-status.entity';
import type {
	AgentChannelRef,
	AgentChannelStatusRepository,
} from '../../repositories/agent-channel-status.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import { AgentChannelReconciler } from '../agent-channel-reconciler.service';
import { AgentChannelStatusReporter } from '../agent-channel-status-reporter';
import { AgentChatIntegration, ChatIntegrationRegistry } from '../agent-chat-integration';
import type { ChatIntegrationService } from '../chat-integration.service';

const RECONCILE_INTERVAL_SECONDS = 60;
const HOST_ID = 'main-this-one';

class FakeIntegration extends AgentChatIntegration {
	constructor(
		readonly type: string,
		private readonly leaderOnly: boolean,
	) {
		super();
	}

	readonly credentialTypes = ['fake'];

	readonly displayLabel = 'Fake';

	readonly displayIcon = 'zap';

	override requiresLeader(): boolean {
		return this.leaderOnly;
	}

	async createAdapter(): Promise<unknown> {
		return {};
	}
}

const slack: AgentIntegrationConfig = { type: 'slack', credentialId: 'cred-slack' };
const telegram: AgentIntegrationConfig = { type: 'telegram', credentialId: 'cred-telegram' };

function makeAgent(integrations: AgentIntegrationConfig[], id = 'agent-1'): Agent {
	return { id, projectId: 'project-1', integrations } as unknown as Agent;
}

function refOf(integration: AgentIntegrationConfig, agentId = 'agent-1'): AgentChannelRef {
	return { agentId, integrationType: integration.type, credentialId: integration.credentialId };
}

function ownRow(
	integration: AgentIntegrationConfig,
	overrides: Partial<AgentChannelStatus> = {},
): AgentChannelStatus {
	return {
		...refOf(integration),
		hostId: HOST_ID,
		status: 'connected',
		errorMessage: null,
		attempts: 0,
		backoffUntil: null,
		expiresAt: new Date(Date.now() + 3 * RECONCILE_INTERVAL_SECONDS * Time.seconds.toMilliseconds),
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as AgentChannelStatus;
}

function erroredOwnRow(
	integration: AgentIntegrationConfig,
	overrides: Partial<AgentChannelStatus> = {},
): AgentChannelStatus {
	return ownRow(integration, {
		status: 'error',
		errorMessage: 'boom',
		attempts: 2,
		...overrides,
	});
}

function build(
	opts: {
		isLeader?: boolean;
		live?: AgentChannelRef[];
		intervalSeconds?: number;
		logger?: Logger;
	} = {},
) {
	const registry = new ChatIntegrationRegistry();
	// Telegram stands in for a polling platform: exactly one main may own it.
	registry.register(new FakeIntegration('telegram', true));
	registry.register(new FakeIntegration('slack', false));

	const agentRepository = mock<AgentRepository>();
	agentRepository.findPublished.mockResolvedValue([]);

	const channelStatusRepository = mock<AgentChannelStatusRepository>();
	channelStatusRepository.findOwnAll.mockResolvedValue([]);
	channelStatusRepository.deleteExpired.mockResolvedValue(0);

	const chatIntegrationService = mock<ChatIntegrationService>();
	const live = opts.live ?? [];
	chatIntegrationService.listLiveChannels.mockReturnValue(live);
	chatIntegrationService.hasLiveChannel.mockImplementation((ref) =>
		live.some(
			(candidate) =>
				candidate.agentId === ref.agentId &&
				candidate.integrationType === ref.integrationType &&
				candidate.credentialId === ref.credentialId,
		),
	);

	const agentsConfig = Object.assign(new AgentsConfig(), {
		channelReconcileIntervalSeconds: opts.intervalSeconds ?? RECONCILE_INTERVAL_SECONDS,
	});
	// The real reporter, so backoff and lease policy are exercised rather than
	// mocked away; only the persistence under it is a double.
	const statusReporter = new AgentChannelStatusReporter(
		mockLogger(),
		agentsConfig,
		channelStatusRepository,
	);

	const errorReporter = mock<ErrorReporter>();
	const logger = opts.logger ?? mockLogger();
	// Mutable, so a test can promote this main between passes the way a real
	// takeover does.
	const role = { isLeader: opts.isLeader ?? true };
	const instanceSettings = {
		hostId: HOST_ID,
		get isLeader() {
			return role.isLeader;
		},
	} as InstanceSettings;
	const reconciler = new AgentChannelReconciler(
		logger,
		agentsConfig,
		agentRepository,
		channelStatusRepository,
		statusReporter,
		chatIntegrationService,
		registry,
		instanceSettings,
		errorReporter,
	);

	return {
		reconciler,
		agentRepository,
		channelStatusRepository,
		chatIntegrationService,
		statusReporter,
		errorReporter,
		role,
	};
}

describe('AgentChannelReconciler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('starting what should be running', () => {
		it('starts a published channel that is not running', async () => {
			const { reconciler, agentRepository, chatIntegrationService } = build();
			const agent = makeAgent([slack]);
			agentRepository.findPublished.mockResolvedValue([agent]);

			await reconciler.reconcile('interval');

			expect(chatIntegrationService.startChannel).toHaveBeenCalledWith(agent, slack);
		});

		it('never tries to start a draft entry, which has no credential', async () => {
			const { reconciler, agentRepository, chatIntegrationService } = build();
			agentRepository.findPublished.mockResolvedValue([
				makeAgent([{ type: 'discord', credentialId: '' }]),
			]);

			await reconciler.reconcile('interval');

			expect(chatIntegrationService.startChannel).not.toHaveBeenCalled();
		});

		it('scrubs credential material out of what it logs about a failure', async () => {
			// A failed Telegram request quotes the API URL, and the bot token is in that
			// path — the same reason `recordFailure` scrubs the message it persists.
			const logger = mock<Logger>();
			const { reconciler, agentRepository, chatIntegrationService } = build({ logger });
			agentRepository.findPublished.mockResolvedValue([makeAgent([telegram])]);
			chatIntegrationService.startChannel.mockRejectedValue(
				new Error(
					'request to https://api.telegram.org/bot123456789:AAFakeTokenValueForTestingOnly12345/setWebhook failed',
				),
			);

			await reconciler.reconcile('interval');

			const logged = logger.warn.mock.calls.at(-1)?.[1] as { error: string };
			expect(logged.error).not.toContain('AAFakeTokenValueForTestingOnly12345');
			expect(logged.error).toContain('setWebhook');
		});

		it('keeps going after one channel fails to start', async () => {
			const { reconciler, agentRepository, chatIntegrationService } = build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([telegram, slack])]);
			chatIntegrationService.startChannel.mockRejectedValueOnce(new Error('boom'));

			await reconciler.reconcile('interval');

			expect(chatIntegrationService.startChannel).toHaveBeenCalledTimes(2);
		});
	});

	describe('standing behind a channel it is running', () => {
		it('extends the lease on a row that already says connected', async () => {
			const { reconciler, agentRepository, channelStatusRepository } = build({
				live: [refOf(slack)],
			});
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			channelStatusRepository.findOwnAll.mockResolvedValue([ownRow(slack)]);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.refreshOwnLease).toHaveBeenCalledWith(
				refOf(slack),
				expect.any(Date),
			);
			expect(channelStatusRepository.saveOwn).not.toHaveBeenCalled();
		});

		it('writes a row for a running channel nothing had reported yet', async () => {
			// The state of every channel on an instance that just upgraded: live, but
			// with no row, so it would otherwise be reported as still starting.
			const { reconciler, agentRepository, channelStatusRepository } = build({
				live: [refOf(slack)],
			});
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.saveOwn).toHaveBeenCalledWith(
				refOf(slack),
				expect.objectContaining({ status: 'connected', attempts: 0, backoffUntil: null }),
			);
		});

		it('replaces its own stale error once the channel is up', async () => {
			const { reconciler, agentRepository, channelStatusRepository } = build({
				live: [refOf(slack)],
			});
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			channelStatusRepository.findOwnAll.mockResolvedValue([erroredOwnRow(slack)]);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.saveOwn).toHaveBeenCalledWith(
				refOf(slack),
				expect.objectContaining({ status: 'connected', errorMessage: null }),
			);
		});
	});

	describe('retry backoff', () => {
		it('keeps the error row alive while it waits out a long retry deadline', async () => {
			// The backoff outgrows a lease from the third consecutive failure on. If the
			// row expired mid-wait the sweep would delete it, dropping the reported
			// reason and resetting the attempt count that grows the backoff.
			const { reconciler, agentRepository, channelStatusRepository } = build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			channelStatusRepository.findOwnAll.mockResolvedValue([
				erroredOwnRow(slack, {
					attempts: 3,
					backoffUntil: new Date(
						Date.now() + 4 * RECONCILE_INTERVAL_SECONDS * Time.seconds.toMilliseconds,
					),
				}),
			]);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.refreshOwnLease).toHaveBeenCalledWith(
				refOf(slack),
				expect.any(Date),
			);
			// Still a held-back retry, not a fresh attempt.
			expect(channelStatusRepository.saveOwn).not.toHaveBeenCalled();
		});

		it('waits out a retry deadline that has not passed', async () => {
			const { reconciler, agentRepository, channelStatusRepository, chatIntegrationService } =
				build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			channelStatusRepository.findOwnAll.mockResolvedValue([
				erroredOwnRow(slack, {
					backoffUntil: new Date(Date.now() + 5 * Time.minutes.toMilliseconds),
				}),
			]);

			await reconciler.reconcile('interval');

			expect(chatIntegrationService.startChannel).not.toHaveBeenCalled();
		});

		it('retries once the deadline has passed', async () => {
			const { reconciler, agentRepository, channelStatusRepository, chatIntegrationService } =
				build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			channelStatusRepository.findOwnAll.mockResolvedValue([
				erroredOwnRow(slack, {
					backoffUntil: new Date(Date.now() - Time.seconds.toMilliseconds),
				}),
			]);

			await reconciler.reconcile('interval');

			expect(chatIntegrationService.startChannel).toHaveBeenCalledTimes(1);
		});

		it.each(['startup', 'leader-takeover'] as const)(
			'ignores the deadline on a %s pass, because the cause may be gone',
			async (reason) => {
				const { reconciler, agentRepository, channelStatusRepository, chatIntegrationService } =
					build();
				agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
				channelStatusRepository.findOwnAll.mockResolvedValue([
					erroredOwnRow(slack, {
						backoffUntil: new Date(Date.now() + Time.hours.toMilliseconds),
					}),
				]);

				await reconciler.reconcile(reason);

				expect(chatIntegrationService.startChannel).toHaveBeenCalledTimes(1);
			},
		);

		it('does not let a lease refresh bring a retry forward', async () => {
			// A heartbeat moves `updatedAt`; only `backoffUntil` decides a retry.
			const { reconciler, agentRepository, channelStatusRepository, chatIntegrationService } =
				build({ live: [refOf(slack)] });
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			channelStatusRepository.findOwnAll.mockResolvedValue([ownRow(slack)]);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.refreshOwnLease).toHaveBeenCalled();
			expect(chatIntegrationService.startChannel).not.toHaveBeenCalled();
		});
	});

	describe('multi-main roles', () => {
		it('does not start a leader-only channel on a follower', async () => {
			const { reconciler, agentRepository, chatIntegrationService } = build({ isLeader: false });
			agentRepository.findPublished.mockResolvedValue([makeAgent([telegram, slack])]);

			await reconciler.reconcile('interval');

			expect(chatIntegrationService.startChannel).toHaveBeenCalledTimes(1);
			expect(chatIntegrationService.startChannel).toHaveBeenCalledWith(expect.anything(), slack);
		});

		it('releases a leader-only channel it holds as a follower', async () => {
			const { reconciler, agentRepository, chatIntegrationService } = build({
				isLeader: false,
				live: [refOf(telegram)],
			});
			agentRepository.findPublished.mockResolvedValue([makeAgent([telegram])]);

			await reconciler.reconcile('interval');

			// Locally, so the main that just took the channel over keeps running it.
			expect(chatIntegrationService.releaseChannelLocally).toHaveBeenCalledWith('agent-1', {
				type: 'telegram',
				credentialId: 'cred-telegram',
			});
			expect(chatIntegrationService.disconnect).not.toHaveBeenCalled();
		});

		it('never touches another instance’s rows, only its own and expired ones', async () => {
			const { reconciler, agentRepository, channelStatusRepository } = build({
				live: [refOf(slack)],
			});
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);

			await reconciler.reconcile('interval');

			// Reads are scoped to this host; the only cross-host write is the
			// expiry sweep.
			expect(channelStatusRepository.findOwnAll).toHaveBeenCalled();
			expect(channelStatusRepository.find).not.toHaveBeenCalled();
			expect(channelStatusRepository.findByAgentId).not.toHaveBeenCalled();
		});

		it('leaves the expiry sweep to the leader', async () => {
			const { reconciler, channelStatusRepository } = build({ isLeader: false });

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.deleteExpired).not.toHaveBeenCalled();
		});

		it('clears rows abandoned by instances that are gone', async () => {
			const { reconciler, channelStatusRepository } = build({ isLeader: true });
			channelStatusRepository.deleteExpired.mockResolvedValue(2);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.deleteExpired).toHaveBeenCalledWith(expect.any(Date));
		});
	});

	describe('withdrawing what it no longer runs', () => {
		it('releases a channel whose agent is no longer published', async () => {
			const { reconciler, chatIntegrationService } = build({ live: [refOf(slack)] });

			await reconciler.reconcile('interval');

			expect(chatIntegrationService.releaseChannelLocally).toHaveBeenCalledWith('agent-1', {
				type: 'slack',
				credentialId: 'cred-slack',
			});
		});

		it('drops its own row for a channel it is not running and should not', async () => {
			// A failed startup, then the agent was unpublished: nothing live to tear
			// down, so nothing would have withdrawn the row.
			const { reconciler, channelStatusRepository } = build();
			channelStatusRepository.findOwnAll.mockResolvedValue([erroredOwnRow(slack)]);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.clearOwnChannel).toHaveBeenCalledWith(refOf(slack));
		});

		it('keeps its own row for a channel it should still be running', async () => {
			const { reconciler, agentRepository, channelStatusRepository } = build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			channelStatusRepository.findOwnAll.mockResolvedValue([erroredOwnRow(slack)]);

			await reconciler.reconcile('interval');

			expect(channelStatusRepository.clearOwnChannel).not.toHaveBeenCalled();
		});
	});

	describe('the loop itself', () => {
		it('schedules no repeating pass when the interval is zero', () => {
			const { reconciler } = build({ intervalSeconds: 0 });
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

			reconciler.init();

			expect(setIntervalSpy).not.toHaveBeenCalled();
			setIntervalSpy.mockRestore();
		});

		it('still starts channels on boot when the interval is zero', async () => {
			// Turning the loop off gives up retries, not the channels themselves: this
			// pass is the only thing that starts them on this main.
			const { reconciler, agentRepository, chatIntegrationService } = build({
				intervalSeconds: 0,
			});
			const agent = makeAgent([slack]);
			agentRepository.findPublished.mockResolvedValue([agent]);

			reconciler.init();

			// `init` fires the boot pass without awaiting it, so wait for it to land.
			await vi.waitFor(() =>
				expect(chatIntegrationService.startChannel).toHaveBeenCalledWith(agent, slack),
			);
		});

		it('still claims leader-only channels on takeover when the interval is zero', async () => {
			// A follower leaves a polling channel alone, so the boot pass starts
			// nothing and only the takeover can — which is what the hook is for.
			const { reconciler, agentRepository, chatIntegrationService, role } = build({
				intervalSeconds: 0,
				isLeader: false,
			});
			const agent = makeAgent([telegram]);
			agentRepository.findPublished.mockResolvedValue([agent]);

			reconciler.init();
			await vi.waitFor(() => expect(agentRepository.findPublished).toHaveBeenCalled());
			expect(chatIntegrationService.startChannel).not.toHaveBeenCalled();

			role.isLeader = true;
			await reconciler.reconcileOnLeaderTakeover();

			expect(chatIntegrationService.startChannel).toHaveBeenCalledWith(agent, telegram);
		});

		it('stays inert on takeover when it was never initialized', async () => {
			// A worker never calls `init`, so it must not start channels.
			const { reconciler, agentRepository } = build();

			await reconciler.reconcileOnLeaderTakeover();

			expect(agentRepository.findPublished).not.toHaveBeenCalled();
		});

		it('reports a failing pass instead of letting it kill the interval', async () => {
			const { reconciler, agentRepository, errorReporter } = build();
			const failure = new Error('database is down');
			agentRepository.findPublished.mockRejectedValue(failure);

			await expect(reconciler.reconcile('interval')).resolves.toBeUndefined();

			// Swallowed for the interval's sake, not silenced: the cause still has to
			// reach telemetry and the log.
			expect(errorReporter.error).toHaveBeenCalledWith(failure, { shouldBeLogged: true });
		});

		it('withdraws everything it said on shutdown, so a restart is not read as degraded', async () => {
			const { reconciler, channelStatusRepository } = build();

			await reconciler.shutdown();

			expect(channelStatusRepository.clearOwnHost).toHaveBeenCalled();
		});

		it('stops working once shut down', async () => {
			const { reconciler, agentRepository, chatIntegrationService } = build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);

			await reconciler.shutdown();
			await reconciler.reconcile('interval');

			expect(chatIntegrationService.startChannel).not.toHaveBeenCalled();
		});
	});
});

describe('AgentChannelReconciler — passes never overlap', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('drops a tick that lands while a pass is still running', async () => {
		// Two passes would both see the channel as not running and both start it,
		// and the second would tear down what the first just built.
		const { reconciler, agentRepository, chatIntegrationService } = build();
		agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
		// Held open from outside, so the second call is made while the first pass is
		// provably still inside `startChannel`.
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		let entered!: () => void;
		const inStartChannel = new Promise<void>((resolve) => (entered = resolve));
		chatIntegrationService.startChannel.mockImplementation(async () => {
			entered();
			await held;
		});

		const first = reconciler.reconcile('interval');
		await inStartChannel;
		const second = reconciler.reconcile('interval');
		release();
		await Promise.all([first, second]);

		expect(chatIntegrationService.startChannel).toHaveBeenCalledTimes(1);
	});

	it('waits for a pass in flight before withdrawing on shutdown', async () => {
		// Otherwise the pass's own `recordConnected` lands after the withdrawal and
		// leaves a row behind for a lease's worth of time.
		const { reconciler, agentRepository, channelStatusRepository, chatIntegrationService } =
			build();
		agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		let entered!: () => void;
		const inStartChannel = new Promise<void>((resolve) => (entered = resolve));
		chatIntegrationService.startChannel.mockImplementation(async () => {
			entered();
			await held;
		});

		const pass = reconciler.reconcile('interval');
		await inStartChannel;
		const shutdown = reconciler.shutdown();
		expect(channelStatusRepository.clearOwnHost).not.toHaveBeenCalled();

		release();
		await Promise.all([pass, shutdown]);

		expect(channelStatusRepository.clearOwnHost).toHaveBeenCalled();
	});

	it('does not start a leader-only channel when leadership was lost mid-pass', async () => {
		const registry = new ChatIntegrationRegistry();
		registry.register(new FakeIntegration('telegram', true));
		const agentRepository = mock<AgentRepository>();
		agentRepository.findPublished.mockResolvedValue([makeAgent([telegram])]);
		const channelStatusRepository = mock<AgentChannelStatusRepository>();
		channelStatusRepository.findOwnAll.mockResolvedValue([]);
		channelStatusRepository.deleteExpired.mockResolvedValue(0);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.listLiveChannels.mockReturnValue([]);
		chatIntegrationService.hasLiveChannel.mockReturnValue(false);

		// Leader while the pass computes what it wants, follower by the time it
		// would start anything.
		let isLeader = true;
		const instanceSettings = {
			hostId: HOST_ID,
			get isLeader() {
				const current = isLeader;
				isLeader = false;
				return current;
			},
		} as InstanceSettings;

		const agentsConfig = Object.assign(new AgentsConfig(), {
			channelReconcileIntervalSeconds: RECONCILE_INTERVAL_SECONDS,
		});
		const reconciler = new AgentChannelReconciler(
			mockLogger(),
			agentsConfig,
			agentRepository,
			channelStatusRepository,
			new AgentChannelStatusReporter(mockLogger(), agentsConfig, channelStatusRepository),
			chatIntegrationService,
			registry,
			instanceSettings,
			mock<ErrorReporter>(),
		);

		await reconciler.reconcile('interval');

		expect(chatIntegrationService.startChannel).not.toHaveBeenCalled();
	});
});

describe('AgentChannelReconciler — role changes while a pass is running', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function heldStart(chatIntegrationService: ReturnType<typeof mock<ChatIntegrationService>>) {
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		let entered!: () => void;
		const inStartChannel = new Promise<void>((resolve) => (entered = resolve));
		chatIntegrationService.startChannel.mockImplementation(async () => {
			entered();
			await held;
		});
		return { release: () => release(), inStartChannel };
	}

	it('still runs a takeover pass that arrived while another pass was running', async () => {
		// The takeover carries the promotion; the running pass decided it was a
		// follower before it. Only waiting would leave leader-only channels stopped
		// until the next tick.
		const { reconciler, agentRepository, chatIntegrationService } = build();
		agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
		const { release, inStartChannel } = heldStart(chatIntegrationService);

		const running = reconciler.reconcile('interval');
		await inStartChannel;
		// The takeover entry point is gated on the loop running, which `init` sets up;
		// the queueing being tested here is in `reconcile` itself.
		const takeover = reconciler.reconcile('leader-takeover');
		release();
		await Promise.all([running, takeover]);

		// Once for the pass that was running, once for the queued takeover.
		expect(agentRepository.findPublished).toHaveBeenCalledTimes(2);
	});

	it('withdraws its own row for a leader-only channel it lost mid-pass', async () => {
		// `forgetOwnOrphans` reads the snapshot taken before the stepdown, so
		// without this the row would keep claiming the channel for this instance.
		const registry = new ChatIntegrationRegistry();
		registry.register(new FakeIntegration('telegram', true));
		const agentRepository = mock<AgentRepository>();
		agentRepository.findPublished.mockResolvedValue([makeAgent([telegram])]);
		const channelStatusRepository = mock<AgentChannelStatusRepository>();
		channelStatusRepository.findOwnAll.mockResolvedValue([]);
		channelStatusRepository.deleteExpired.mockResolvedValue(0);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.listLiveChannels.mockReturnValue([]);
		chatIntegrationService.hasLiveChannel.mockReturnValue(false);

		let isLeader = true;
		const instanceSettings = {
			hostId: HOST_ID,
			get isLeader() {
				const current = isLeader;
				isLeader = false;
				return current;
			},
		} as InstanceSettings;

		const agentsConfig = Object.assign(new AgentsConfig(), {
			channelReconcileIntervalSeconds: RECONCILE_INTERVAL_SECONDS,
		});
		const reconciler = new AgentChannelReconciler(
			mockLogger(),
			agentsConfig,
			agentRepository,
			channelStatusRepository,
			new AgentChannelStatusReporter(mockLogger(), agentsConfig, channelStatusRepository),
			chatIntegrationService,
			registry,
			instanceSettings,
			mock<ErrorReporter>(),
		);

		await reconciler.reconcile('interval');

		expect(chatIntegrationService.startChannel).not.toHaveBeenCalled();
		expect(channelStatusRepository.clearOwnChannel).toHaveBeenCalledWith(refOf(telegram));
	});

	it('does not report a startup that finished after shutdown stopped waiting', async () => {
		// Past the bound the rows are already withdrawn, so a write landing
		// afterwards would report this host as running the channel until its lease
		// expired — with the process gone and nothing left to refresh or correct it.
		vi.useFakeTimers();
		try {
			const {
				reconciler,
				agentRepository,
				channelStatusRepository,
				chatIntegrationService,
				statusReporter,
			} = build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			let finishStartup!: () => void;
			const startupDone = new Promise<void>((resolve) => (finishStartup = resolve));
			// Mirrors `connect`, which reports from inside the startup, so the write
			// lands whenever the platform finally answers.
			chatIntegrationService.startChannel.mockImplementation(async () => {
				await startupDone;
				await statusReporter.recordConnected(refOf(slack));
			});

			const pass = reconciler.reconcile('interval');
			await vi.advanceTimersByTimeAsync(0);

			const shutdown = reconciler.shutdown();
			await vi.advanceTimersByTimeAsync(6 * Time.seconds.toMilliseconds);
			await shutdown;
			expect(channelStatusRepository.clearOwnHost).toHaveBeenCalled();

			finishStartup();
			await pass;

			expect(channelStatusRepository.saveOwn).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it('gives up waiting on a stalled pass rather than blocking shutdown', async () => {
		vi.useFakeTimers();
		try {
			const { reconciler, agentRepository, channelStatusRepository, chatIntegrationService } =
				build();
			agentRepository.findPublished.mockResolvedValue([makeAgent([slack])]);
			// Never resolves: a platform that accepted the connection and went quiet.
			chatIntegrationService.startChannel.mockImplementation(
				async () => await new Promise<void>(() => {}),
			);

			void reconciler.reconcile('interval');
			await vi.advanceTimersByTimeAsync(0);

			const shutdown = reconciler.shutdown();
			await vi.advanceTimersByTimeAsync(6 * Time.seconds.toMilliseconds);
			await shutdown;

			expect(channelStatusRepository.clearOwnHost).toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});
});
