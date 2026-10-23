import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';

/**
 * How long a single Gateway listener runs before {@link DiscordGateway}
 * re-arms it. The adapter's listener is duration-bounded (it destroys the
 * discord.js client when the timer fires), so a long-running n8n process has
 * to restart it in a loop.
 *
 * Must stay below 2^31-1 ms: Node clamps larger `setTimeout` delays to 1ms,
 * which would tear the socket down immediately and log only at info level.
 * 12 hours keeps the ~1-3s reconnect gap rare; discord.js recovers from
 * transient disconnects on its own, so this loop is a safety net rather than
 * the primary resilience mechanism.
 */
const GATEWAY_SESSION_MS = 12 * 60 * 60 * 1000;

/** A listener that lived at least this long is treated as healthy, resetting the backoff. */
const GATEWAY_HEALTHY_RUN_MS = 60_000;

/** Ceiling for the re-arm backoff after repeated fast exits. */
const GATEWAY_MAX_BACKOFF_MS = 5 * 60_000;

/** Minimal shape of the ESM-only `@chat-adapter/discord` adapter we depend on. */
export interface DiscordGatewayAdapter {
	startGatewayListener(
		options: { waitUntil?: (task: Promise<unknown>) => void },
		durationMs?: number,
		abortSignal?: AbortSignal,
		webhookUrl?: string,
	): Promise<{ ok: boolean; text: () => Promise<string> }>;
}

export interface DiscordConnection {
	adapter: DiscordGatewayAdapter;
	/**
	 * Kept because context queries hit the Discord REST API directly and only
	 * receive a descriptor, not the credential.
	 */
	botToken: string;
	/**
	 * Outbound preview connections keep the bot token registered but must not
	 * open a Gateway listener.
	 */
	ingressEnabled: boolean;
}

interface DiscordGatewaySession extends DiscordConnection {
	abort?: AbortController;
	running?: Promise<void>;
	/** Whether this main should currently hold a socket, independent of whether one is open yet. */
	desired?: boolean;
}

export class DiscordGateway {
	/** Live connections on this main, keyed by `agentId:credentialId`. */
	private readonly sessions = new Map<string, DiscordGatewaySession>();

	/**
	 * Bumped by every start/stop sweep so an in-flight stepdown can tell that a
	 * takeover overtook it. Per-session `desired` cannot carry this: the stepdown
	 * loop clears it on each session it reaches, wiping the takeover's intent for
	 * every session it has not drained yet.
	 */
	private sweep = 0;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/** Register a freshly connected session, opening a socket when this main leads. */
	register(key: string, connection: DiscordConnection): void {
		this.sessions.set(key, { ...connection });
		if (this.instanceSettings.isLeader) this.start(key);
	}

	/** Stop and forget the session at `key`, if any. It will not be restarted. */
	async discard(key: string): Promise<void> {
		const session = this.sessions.get(key);
		if (!session) return;

		// Remove before draining, with no await in between: while the session is
		// still reachable, a racing takeover could re-arm it, and the socket would
		// then be left with nothing able to close it.
		this.sessions.delete(key);
		await this.drain(session);
	}

	/** Open sockets for every session — leader takeover. */
	startAll(): void {
		this.sweep += 1;
		for (const key of this.sessions.keys()) this.start(key);
	}

	/** Close every socket but keep the sessions — leader stepdown and shutdown. */
	async pauseAll(): Promise<void> {
		const sweep = ++this.sweep;
		// Snapshot: `pause` awaits, so the map can change under the loop.
		for (const key of [...this.sessions.keys()]) {
			// A takeover overtook this stepdown; the sockets it re-armed must stay up.
			if (this.sweep !== sweep) return;
			await this.pause(key);
		}
	}

	/** The bot token for a live session, for context queries that hit the REST API. */
	botTokenFor(key: string): string | undefined {
		return this.sessions.get(key)?.botToken;
	}

	/**
	 * Session key (if any) already registered with `botToken`, excluding
	 * `excludeKey`. Used to reject a second agent claiming the same Discord bot
	 * on this main.
	 */
	sessionKeyUsingBotToken(botToken: string, excludeKey?: string): string | undefined {
		for (const [key, session] of this.sessions) {
			if (excludeKey !== undefined && key === excludeKey) continue;
			if (session.botToken === botToken) return key;
		}
		return undefined;
	}

	/**
	 * Close the socket but keep the session registered, so a takeover that landed
	 * during the drain can have it back.
	 */
	private async pause(key: string): Promise<void> {
		const session = this.sessions.get(key);
		if (!session) return;

		session.desired = false;
		if (!(await this.drain(session))) return;

		// A takeover that landed mid-drain set `desired` back to true but was turned
		// away by `start`'s guard; honour it now. Restarting by key rather than by
		// the session object is what makes this safe: `start` re-reads the map, so a
		// session replaced or removed during the drain cannot be resurrected here.
		if (session.desired && this.instanceSettings.isLeader) this.start(key);
	}

	/**
	 * Abort the socket and wait for its loop to finish.
	 *
	 * Returns whether this caller owns the drain. `false` means either there was
	 * no socket, or a concurrent drain finished first and re-armed the session —
	 * in which case the live socket belongs to that caller and must be left alone.
	 */
	private async drain(session: DiscordGatewaySession): Promise<boolean> {
		if (!session.abort) return false;

		// `abort` stays set until the loop has drained, so `start`'s guard still
		// reports the socket as occupied and a racing takeover cannot open a second
		// one mid-teardown.
		session.abort.abort();
		await session.running?.catch(() => {});

		// `runLoop`'s `finally` clears both fields before this resumes, so a set
		// `abort` can only mean another drain on this session finished first and
		// already re-armed it.
		if (session.abort) return false;
		session.running = undefined;
		return true;
	}

	/**
	 * Idempotent: the guard keeps a leader takeover racing a connect from
	 * opening a second socket. Discord accepts a duplicate identify for the
	 * same bot, so a second socket would deliver every message twice and the
	 * agent would answer twice.
	 */
	private start(key: string): void {
		const session = this.sessions.get(key);
		if (!session?.ingressEnabled) return;

		// Recorded before the guard below: a takeover landing while a drain is
		// still in flight is turned away, so it has to leave the intent behind for
		// the tail of `pause` to honour. Otherwise this main believes it leads
		// while holding no socket, and receives nothing until restart.
		session.desired = true;
		if (session.abort) return;

		const abort = new AbortController();
		session.abort = abort;
		// The loop is fire-and-forget, so an unexpected throw would otherwise be
		// an unhandled rejection — fatal under Node's default behaviour.
		session.running = this.runLoop(key, session, abort).catch((error: unknown) => {
			this.logger.error(
				`[DiscordIntegration] Gateway loop for ${key} crashed: ${error instanceof Error ? error.message : String(error)}`,
			);
		});
	}

	private async runLoop(
		key: string,
		session: DiscordGatewaySession,
		abort: AbortController,
	): Promise<void> {
		let consecutiveFastExits = 0;

		try {
			while (!abort.signal.aborted) {
				const startedAt = Date.now();
				let listener: Promise<unknown> | undefined;

				// `webhookUrl` is deliberately omitted: the adapter's forwarding mode
				// POSTs the raw bot token in a header and skips Ed25519 verification.
				// Direct mode keeps both the token and the dispatch in-process.
				const response = await session.adapter.startGatewayListener(
					{
						waitUntil: (task: Promise<unknown>) => {
							listener = task;
						},
					},
					GATEWAY_SESSION_MS,
					abort.signal,
					undefined,
				);

				if (response.ok) {
					await listener?.catch((error: unknown) => {
						this.logger.warn(
							`[DiscordIntegration] Gateway listener for ${key} ended with an error: ${error instanceof Error ? error.message : String(error)}`,
						);
					});
				} else {
					this.logger.error(
						`[DiscordIntegration] Gateway listener failed to start for ${key}: ${await response.text()}`,
					);
				}

				if (abort.signal.aborted) break;

				// The adapter swallows a failed `client.login` and resolves the
				// listener straight away, so a short run means the socket never came
				// up. Re-arming immediately would spin: a fresh client and a fresh
				// identify every few hundred milliseconds until Discord rate-limits
				// the bot.
				if (Date.now() - startedAt >= GATEWAY_HEALTHY_RUN_MS) {
					consecutiveFastExits = 0;
					continue;
				}

				consecutiveFastExits += 1;
				const backoffMs = Math.min(2 ** (consecutiveFastExits - 1) * 1000, GATEWAY_MAX_BACKOFF_MS);
				this.logger.warn(
					`[DiscordIntegration] Gateway listener for ${key} exited early; retrying in ${backoffMs}ms`,
				);
				await sleepUnlessAborted(backoffMs, abort.signal);
			}
		} finally {
			session.abort = undefined;
			session.running = undefined;
		}
	}
}

/** Resolve after `ms`, or immediately once `signal` aborts. */
async function sleepUnlessAborted(ms: number, signal: AbortSignal): Promise<void> {
	if (signal.aborted) return;
	await new Promise<void>((resolve) => {
		const onAbort = () => {
			clearTimeout(timer);
			resolve();
		};
		// The signal outlives this sleep — it belongs to the session, not the
		// iteration — so the listener has to come off when the timer wins, or a
		// backing-off loop accumulates one per retry for as long as it runs.
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		timer.unref();
		signal.addEventListener('abort', onAbort, { once: true });
	});
}
