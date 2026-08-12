import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { jsonParse, OperationalError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { createConnection, createServer, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { MessageTransport } from './message-transport.interface';

type MessageHandler = (message: string, channel: string) => void;

interface Frame {
	type: 'publish' | 'subscribe';
	channel: string;
	message?: string;
}

const CONNECT_MAX_ATTEMPTS = 10;
const CONNECT_RETRY_MS = 200;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error;
}

function isUnreachable(error: unknown): boolean {
	return isErrnoException(error) && (error.code === 'ECONNREFUSED' || error.code === 'ENOENT');
}

/**
 * Proof-of-concept `MessageTransport` for single-host deployments with no Redis
 * configured — the "IPC transport, hosted by the hypervisor" from the process-
 * hypervisor RFC. There is no hypervisor process yet, so this class plays both
 * roles on a plain Unix domain socket: the first process to reach the socket path
 * binds it and relays messages between every connected process (standing in for
 * the hypervisor's broker role); every process, including that one, then talks to
 * the socket purely as a client. Once a hypervisor process exists, it would always
 * bind first and this class would only ever take the client branch.
 *
 * Proves the abstraction is swappable, not that this is production-ready: no
 * reconnect-on-drop, no backpressure handling, no Windows named-pipe path.
 */
@Service()
export class IpcMessageTransport implements MessageTransport {
	private connection?: Promise<Socket>;

	private server?: Server;

	/** Per-connection subscribed channels, populated only while acting as broker. */
	private readonly brokerSubscriptions = new Map<Socket, Set<string>>();

	private buffer = '';

	private readonly handlersByChannel = new Map<string, MessageHandler[]>();

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped(['scaling', 'pubsub']);
	}

	private get socketPath() {
		// Reuses the Redis key-prefix config for deployment isolation - the same purpose
		// it already serves for Redis pubsub channel names. Hashed (rather than used
		// verbatim) to keep the path within the ~104-byte sockaddr_un limit on macOS/BSD
		// regardless of how long an operator's configured prefix is or how deeply nested
		// the OS temp dir is.
		const prefixHash = createHash('sha256')
			.update(this.globalConfig.redis.prefix)
			.digest('hex')
			.slice(0, 16);

		return join(tmpdir(), `n8n-ipc-${prefixHash}.sock`);
	}

	async publish(channel: string, message: string) {
		const socket = await this.getConnection();
		this.writeFrame(socket, { type: 'publish', channel, message });
	}

	async subscribe(channel: string, onMessage: MessageHandler) {
		const handlers = this.handlersByChannel.get(channel) ?? [];
		handlers.push(onMessage);
		this.handlersByChannel.set(channel, handlers);

		const socket = await this.getConnection();
		this.writeFrame(socket, { type: 'subscribe', channel });
	}

	shutdown() {
		void this.connection?.then((socket) => socket.end()).catch(() => {});

		if (this.server) {
			this.server.close();
			try {
				unlinkSync(this.socketPath);
			} catch {
				// already removed, or never fully bound
			}
		}
	}

	// #region Client

	private async getConnection(): Promise<Socket> {
		this.connection ??= this.connectOrBecomeBroker();

		try {
			return await this.connection;
		} catch (error) {
			this.connection = undefined; // allow a retry on the next publish/subscribe call
			throw error;
		}
	}

	private async connectOrBecomeBroker(): Promise<Socket> {
		for (let attempt = 0; attempt < CONNECT_MAX_ATTEMPTS; attempt++) {
			try {
				return await this.connect();
			} catch (error) {
				if (!isUnreachable(error)) throw error;
			}

			// Nobody is listening yet - try to become the broker. If another process
			// wins the race, `tryBecomeBroker` returns false and we just retry connecting.
			if (await this.tryBecomeBroker()) return await this.connect();

			await sleep(CONNECT_RETRY_MS);
		}

		throw new OperationalError(
			`Could not connect to the n8n IPC message transport at ${this.socketPath}`,
		);
	}

	private async connect(): Promise<Socket> {
		const socket = createConnection(this.socketPath);

		await new Promise<void>((resolve, reject) => {
			socket.once('connect', resolve);
			socket.once('error', reject);
		});

		socket.setEncoding('utf8');
		socket.on('data', (chunk: string) => this.onClientData(chunk));
		socket.on('error', (error) => this.logger.error('IPC transport connection error', { error }));

		return socket;
	}

	private onClientData(chunk: string) {
		for (const frame of this.readFrames(chunk)) {
			if (frame.type !== 'publish' || frame.message === undefined) continue;

			for (const handler of this.handlersByChannel.get(frame.channel) ?? []) {
				handler(frame.message, frame.channel);
			}
		}
	}

	// #endregion

	// #region Broker (only while this process won the bind race)

	private async tryBecomeBroker(): Promise<boolean> {
		if (existsSync(this.socketPath)) {
			try {
				unlinkSync(this.socketPath); // stale file from a crashed former broker
			} catch {
				// another process already cleaned it up
			}
		}

		const server = createServer((socket) => this.handleBrokerConnection(socket));

		try {
			await new Promise<void>((resolve, reject) => {
				server.once('listening', resolve);
				server.once('error', reject);
				server.listen(this.socketPath);
			});
		} catch (error) {
			if (isErrnoException(error) && error.code === 'EADDRINUSE') return false; // lost the race
			throw error;
		}

		this.server = server;
		this.logger.debug(`Became IPC transport broker at ${this.socketPath}`);
		return true;
	}

	private handleBrokerConnection(socket: Socket) {
		const subscriptions = new Set<string>();
		this.brokerSubscriptions.set(socket, subscriptions);

		let buffer = '';
		socket.setEncoding('utf8');
		socket.on('data', (chunk: string) => {
			const [remainder, ...frames] = this.splitFrames(buffer + chunk);
			buffer = remainder;

			for (const frame of frames) {
				if (frame.type === 'subscribe') subscriptions.add(frame.channel);
				else if (frame.type === 'publish') this.broadcast(frame);
			}
		});

		socket.on('close', () => this.brokerSubscriptions.delete(socket));
		socket.on('error', (error) => {
			this.logger.error('IPC transport broker connection error', { error });
		});
	}

	private broadcast(frame: Frame) {
		for (const [socket, channels] of this.brokerSubscriptions) {
			if (channels.has(frame.channel)) this.writeFrame(socket, frame);
		}
	}

	// #endregion

	private writeFrame(socket: Socket, frame: Frame) {
		socket.write(JSON.stringify(frame) + '\n');
	}

	/** Newline-delimited JSON framing, consuming from the client-side buffer. */
	private readFrames(chunk: string): Frame[] {
		const [remainder, ...frames] = this.splitFrames(this.buffer + chunk);
		this.buffer = remainder;
		return frames;
	}

	private splitFrames(data: string): [string, ...Frame[]] {
		const lines = data.split('\n');
		const remainder = lines.pop() ?? '';
		const frames = lines
			.map((line) => jsonParse<Frame | null>(line, { fallbackValue: null }))
			.filter((frame): frame is Frame => frame !== null);

		return [remainder, ...frames];
	}
}
