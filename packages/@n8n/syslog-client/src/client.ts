import * as dgram from 'dgram';
import { EventEmitter } from 'events';
import * as net from 'net';
import * as os from 'os';
import * as tls from 'tls';

import { Facility, Severity, Transport } from './constants';
import {
	ConnectionError,
	SyslogClientError,
	TimeoutError,
	TransportError,
	ValidationError,
} from './errors';
import { clientOptionsSchema, logOptionsSchema } from './schemas';
import type {
	ClientOptions,
	DateFormatter,
	LogOptions,
	ResolvedLogOptions,
	SyslogCallback,
	TransportConnection,
} from './types';
import { buildFormattedMessage, defaultDateFormatter, isIPv6 } from './utils';

/**
 * Syslog client supporting UDP, TCP, TLS, and Unix socket transports.
 * Supports both RFC 3164 and RFC 5424 formats.
 *
 * @example
 * ```typescript
 * const client = new SyslogClient('192.168.1.1', {
 *   transport: Transport.Tcp,
 *   facility: Facility.Local0,
 * });
 *
 * // Callback API
 * client.log('Test message', (error) => {
 *   if (error) console.error(error);
 * });
 *
 * // Promise API (when no callback provided)
 * await client.log('Test message');
 * await client.log('Test message', { severity: Severity.Error });
 *
 * client.close();
 * ```
 */
export class SyslogClient extends EventEmitter {
	// Public configuration properties
	readonly target: string;
	readonly syslogHostname: string;
	readonly port: number;
	readonly tcpTimeout: number;
	readonly facility: Facility;
	readonly severity: Severity;
	readonly rfc3164: boolean;
	readonly appName: string;
	readonly dateFormatter: DateFormatter;
	readonly udpBindAddress?: string;
	readonly transport: Transport;
	readonly tlsCA?: string | string[] | Buffer | Buffer[];

	// Private state
	private transport_?: TransportConnection;
	private connecting = false;
	private getTransportRequests: Array<
		(error: Error | null, transport?: TransportConnection) => void
	> = [];

	/**
	 * Create a new syslog client.
	 *
	 * @param target - Target host/path (IP address, hostname, or Unix socket path)
	 * @param options - Client configuration options
	 * @throws {ValidationError} If options validation fails
	 */
	constructor(target?: string, options?: ClientOptions) {
		super();

		this.target = target ?? '127.0.0.1';

		const validationResult = clientOptionsSchema.safeParse(options ?? {});
		if (!validationResult.success) {
			throw ValidationError.fromZod('Invalid client options', validationResult.error.errors);
		}

		const opts = validationResult.data;

		// Initialize properties with defaults
		this.syslogHostname = opts.syslogHostname ?? os.hostname();
		this.port = opts.port ?? 514;
		this.tcpTimeout = opts.tcpTimeout ?? 10000;

		// BUG FIX: Original code has incorrect logic (typeof !== "number" || default)
		// Should be: typeof === "number" ? value : default
		this.facility = typeof opts.facility === 'number' ? opts.facility : Facility.Local0;
		this.severity = typeof opts.severity === 'number' ? opts.severity : Severity.Informational;

		this.rfc3164 = opts.rfc3164 ?? true;
		this.appName = opts.appName ?? process.title.substring(process.title.lastIndexOf('/') + 1, 48);
		this.dateFormatter = opts.dateFormatter ?? defaultDateFormatter;
		this.udpBindAddress = opts.udpBindAddress;
		this.transport = opts.transport ?? Transport.Udp;
		this.tlsCA = opts.tlsCA;
	}

	/**
	 * Log a message to syslog.
	 * Supports both callback and promise-based API.
	 *
	 * @param message - Message to log
	 * @param options - Optional log options or callback
	 * @param errorCb - Optional callback
	 * @returns Promise<void> if no callback provided, otherwise void
	 *
	 * @example
	 * ```typescript
	 * // Callback API
	 * client.log('Test message', (error) => {
	 *   if (error) console.error(error);
	 * });
	 *
	 * // Promise API
	 * await client.log('Test message');
	 * await client.log('Test message', { severity: Severity.Error });
	 * ```
	 */
	log(
		message: string,
		options?: LogOptions | SyslogCallback,
		errorCb?: SyslogCallback,
	): Promise<void> | void {
		// Parse arguments
		let opts: LogOptions = {};
		let logCallback: SyslogCallback | undefined;

		if (typeof options === 'function') {
			logCallback = options;
		} else if (typeof options === 'object') {
			opts = options;
			logCallback = errorCb;
		}

		// Promise mode: no callback provided
		if (!logCallback) {
			return new Promise<void>((resolve, reject) => {
				this.logInternal(message, opts, (error) => {
					if (error) reject(error);
					else resolve();
				});
			});
		}

		// Callback mode
		this.logInternal(message, opts, logCallback);
	}

	/**
	 * Internal log implementation using callbacks.
	 */
	private logInternal(message: string, options: LogOptions, errorCb: SyslogCallback): void {
		// Validate options
		const validationResult = logOptionsSchema.safeParse(options);
		if (!validationResult.success) {
			errorCb(ValidationError.fromZod('Invalid log options', validationResult.error.errors));
			return;
		}

		// Resolve options with defaults
		const resolvedOptions: ResolvedLogOptions = {
			facility: options.facility ?? this.facility,
			severity: options.severity ?? this.severity,
			rfc3164: options.rfc3164 ?? this.rfc3164,
			appName: options.appName ?? this.appName,
			syslogHostname: options.syslogHostname ?? this.syslogHostname,
			timestamp: options.timestamp,
			msgid: options.msgid,
		};

		// Build formatted message
		const formattedMessage = buildFormattedMessage(message, resolvedOptions, this.dateFormatter);

		// Get transport and send
		this.getTransport((error, transport) => {
			if (error || !transport) {
				errorCb(error ?? new ConnectionError('Failed to get transport'));
				return;
			}
			this.sendMessage(transport, formattedMessage, errorCb);
		});
	}

	/**
	 * Send message via transport.
	 */
	private sendMessage(
		transport: TransportConnection,
		message: Buffer,
		completionCb: SyslogCallback,
	): void {
		try {
			if (this.isStreamSocket(transport)) {
				// TCP/TLS/Unix: use write
				transport.write(message, (error) => {
					if (error) {
						completionCb(new TransportError('Write failed', this.getTransportName(), error));
					} else {
						completionCb();
					}
				});
			} else if (this.isUdpSocket(transport)) {
				// UDP: use send
				transport.send(message, 0, message.length, this.port, this.target, (error) => {
					if (error) {
						completionCb(new TransportError('Send failed', 'UDP', error));
					} else {
						completionCb();
					}
				});
			} else {
				completionCb(new SyslogClientError(`Unknown transport: ${this.transport}`));
			}
		} catch (error) {
			this.onError(this.normalizeError(error));
			completionCb(this.normalizeError(error));
		}
	}

	/**
	 * Get or create transport connection.
	 */
	private getTransport(
		completionCb: (error: Error | null, transport?: TransportConnection) => void,
	): void {
		// Return existing transport
		if (this.transport_) {
			completionCb(null, this.transport_);
			return;
		}

		// Queue request
		this.getTransportRequests.push(completionCb);

		// Already connecting, wait for result
		if (this.connecting) {
			return;
		}

		this.connecting = true;

		// Create transport and notify all waiting requests
		const notifyAllWaitingRequests = (error: Error | null, transport?: TransportConnection) => {
			// Drain queue: notify all waiting callbacks
			while (this.getTransportRequests.length > 0) {
				const listenerCb = this.getTransportRequests.shift();
				if (listenerCb) listenerCb(error, transport);
			}
			this.connecting = false;
		};

		// Create appropriate transport
		if (this.transport === Transport.Udp) {
			this.createUdpTransport(notifyAllWaitingRequests);
		} else if (this.transport === Transport.Tcp || this.transport === Transport.Unix) {
			this.createTcpTransport(notifyAllWaitingRequests);
		} else if (this.transport === Transport.Tls) {
			this.createTlsTransport(notifyAllWaitingRequests);
		} else {
			notifyAllWaitingRequests(
				new SyslogClientError(`Unknown transport: ${this.getTransportName()}`),
			);
		}
	}

	/**
	 * Create TCP or Unix socket transport.
	 */
	private createTcpTransport(
		completionCb: (error: Error | null, transport?: TransportConnection) => void,
	): void {
		const options =
			this.transport === Transport.Unix
				? { path: this.target }
				: {
						host: this.target,
						port: this.port,
						family: isIPv6(this.target) ? 6 : 4,
					};

		let transport: net.Socket;
		try {
			transport = net.createConnection(options, () =>
				this.onSocketConnected(transport, completionCb),
			);
		} catch (error) {
			completionCb(
				new ConnectionError('Failed to create TCP connection', this.normalizeError(error)),
			);
			this.onError(this.normalizeError(error));
			return;
		}

		this.setupSocketHandlers(transport, completionCb);
	}

	/**
	 * Create TLS transport.
	 */
	private createTlsTransport(
		completionCb: (error: Error | null, transport?: TransportConnection) => void,
	): void {
		const options: tls.ConnectionOptions = {
			host: this.target,
			port: this.port,
			ca: this.tlsCA,
			minVersion: 'TLSv1.2',
		};

		let transport: tls.TLSSocket;
		try {
			transport = tls.connect(options, () => this.onSocketConnected(transport, completionCb));
		} catch (error) {
			completionCb(
				new ConnectionError('Failed to create TLS connection', this.normalizeError(error)),
			);
			this.onError(this.normalizeError(error));
			return;
		}

		this.setupSocketHandlers(transport, completionCb);
	}

	/**
	 * Setup event handlers for stream-based transports (TCP/TLS/Unix).
	 */
	private setupSocketHandlers(
		socket: net.Socket | tls.TLSSocket,
		completionCb: (error: Error | null, transport?: TransportConnection) => void,
	): void {
		// Timeout handler
		socket.setTimeout(this.tcpTimeout, () => {
			const error = new TimeoutError();
			socket.destroy();
			this.emit('error', error);
			completionCb(error);
		});

		// Error handler
		socket.on('error', (socketError: Error) => {
			socket.destroy();
			const error = new ConnectionError('Transport error', socketError);
			this.onError(socketError);
			completionCb(error);
		});

		// Close handler
		socket.on('close', this.onClose.bind(this));
		socket.unref();
	}

	/**
	 * Handle successful socket connection.
	 */
	private onSocketConnected(
		socket: net.Socket | tls.TLSSocket,
		completionCb: (error: Error | null, transport?: TransportConnection) => void,
	): void {
		this.transport_ = socket;
		socket.setTimeout(0); // Clear connection timeout
		completionCb(null, this.transport_);
	}

	/**
	 * Create UDP transport.
	 */
	private createUdpTransport(
		completionCb: (error: Error | null, transport?: TransportConnection) => void,
	): void {
		try {
			const family = isIPv6(this.target) ? 6 : 4;
			this.transport_ = dgram.createSocket(`udp${family}` as dgram.SocketType);

			// Bind to specific address if specified
			if (this.udpBindAddress) {
				this.transport_.bind({ address: this.udpBindAddress });
			}

			// Setup event handlers
			this.transport_.on('close', this.onClose.bind(this));
			this.transport_.on('error', (transportError) => {
				const error = new ConnectionError('UDP socket error', transportError);
				this.onError(error);
				completionCb(error);
			});

			// Unref to not block process exit
			this.transport_.unref();

			completionCb(null, this.transport_);
		} catch (transportError) {
			if (this.transport_ && this.isUdpSocket(this.transport_)) {
				try {
					this.transport_.close();
				} catch {
					// Ignore cleanup error
				}
			}
			const error = this.normalizeError(transportError);
			this.onError(error);
			completionCb(new ConnectionError('Failed to create UDP socket', error));
		}
	}

	/**
	 * Close the client and destroy the transport.
	 *
	 * @returns this for chaining
	 */
	close(): this {
		if (this.transport_) {
			if (this.isStreamSocket(this.transport_)) {
				this.transport_.destroy();
			} else if (this.isUdpSocket(this.transport_)) {
				this.transport_.close();
			}
			this.transport_ = undefined;
		} else {
			this.onClose();
		}

		return this;
	}

	/**
	 * Handle close event.
	 */
	private onClose(): this {
		if (this.transport_) {
			if ('destroy' in this.transport_) {
				this.transport_.destroy();
			}
			this.transport_ = undefined;
		}

		this.emit('close');
		return this;
	}

	/**
	 * Handle error event.
	 */
	private onError(error: Error): this {
		if (this.transport_) {
			if ('destroy' in this.transport_) {
				this.transport_.destroy();
			}
			this.transport_ = undefined;
		}

		this.emit('error', error);
		return this;
	}

	/**
	 * Type guard to check if transport is a stream socket (TCP/TLS/Unix).
	 */
	private isStreamSocket(transport: TransportConnection): transport is net.Socket | tls.TLSSocket {
		return 'write' in transport && typeof transport.write === 'function';
	}

	/**
	 * Type guard to check if transport is a UDP socket.
	 */
	private isUdpSocket(transport: TransportConnection): transport is dgram.Socket {
		return 'send' in transport && typeof transport.send === 'function';
	}

	/**
	 * Get transport name as string.
	 * Required because const enums don't have reverse mapping at runtime.
	 */
	private getTransportName(): string {
		switch (this.transport) {
			case Transport.Tcp:
				return 'TCP';
			case Transport.Udp:
				return 'UDP';
			case Transport.Tls:
				return 'TLS';
			case Transport.Unix:
				return 'Unix';
			default:
				return 'Unknown';
		}
	}

	/**
	 * Normalize any error to an Error instance.
	 */
	private normalizeError(error: unknown): Error {
		return error instanceof Error ? error : new Error(String(error));
	}
}
