/**
 * VNC client implementation using pure TypeScript RFB protocol.
 * Provides a persistent connection to a VNC server for mouse, keyboard, and screenshot operations.
 */

import { Socket, createConnection } from 'net';
import { EventEmitter } from 'events';
import type { VncConfig, ConnectionState, ServerInit, PixelFormat, RectangleHeader } from './types';
import {
	DEFAULT_VNC_CONFIG,
	ClientMessageType,
	ServerMessageType,
	EncodingType,
	SecurityType,
	VncConnectionError,
	VncProtocolError,
} from './types';
import { RfbReader, RfbWriter } from './protocol';
import { encodePng, convertVncPixelData, cropPixelData, scalePixelData } from './framebuffer';

// Event types for VncClient
interface VncClientEvents {
	connected: [];
	disconnected: [];
	error: [Error];
	framebuffer: [Uint8Array];
}

/**
 * VNC client for controlling remote desktops via the RFB protocol.
 * Uses a singleton pattern for persistent connection management.
 */
export class VncClient extends EventEmitter<VncClientEvents> {
	private socket: Socket | null = null;
	private state: ConnectionState = 'disconnected';
	private serverInit: ServerInit | null = null;
	private reconnectAttempts = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private receiveBuffer = Buffer.alloc(0);

	// Track current mouse position
	private currentX = 0;
	private currentY = 0;

	// Framebuffer data
	private framebuffer: Uint8Array | null = null;

	// Pending framebuffer request callbacks
	private framebufferCallbacks: Array<{
		resolve: (data: Uint8Array) => void;
		reject: (error: Error) => void;
		timeout: ReturnType<typeof setTimeout>;
	}> = [];

	// Connection promise for waiting on connection
	private connectPromise: Promise<void> | null = null;
	private connectResolve: (() => void) | null = null;
	private connectReject: ((error: Error) => void) | null = null;

	// Singleton instance
	private static instance: VncClient | null = null;

	constructor(private readonly config: VncConfig = DEFAULT_VNC_CONFIG) {
		super();
	}

	/**
	 * Get the singleton VncClient instance.
	 * Creates a new instance if one doesn't exist.
	 */
	static getInstance(config?: VncConfig): VncClient {
		if (!VncClient.instance) {
			const effectiveConfig: VncConfig = {
				host: process.env.VNC_HOST ?? config?.host ?? DEFAULT_VNC_CONFIG.host,
				port: parseInt(process.env.VNC_PORT ?? String(config?.port ?? DEFAULT_VNC_CONFIG.port), 10),
				reconnectDelay: config?.reconnectDelay ?? DEFAULT_VNC_CONFIG.reconnectDelay,
				maxReconnectAttempts:
					config?.maxReconnectAttempts ?? DEFAULT_VNC_CONFIG.maxReconnectAttempts,
			};
			VncClient.instance = new VncClient(effectiveConfig);
		}
		return VncClient.instance;
	}

	/**
	 * Reset the singleton instance (useful for testing)
	 */
	static resetInstance(): void {
		if (VncClient.instance) {
			VncClient.instance.disconnect();
			VncClient.instance = null;
		}
	}

	/**
	 * Get current connection state
	 */
	getState(): ConnectionState {
		return this.state;
	}

	/**
	 * Get server information (available after connection)
	 */
	getServerInfo(): ServerInit | null {
		return this.serverInit;
	}

	/**
	 * Get framebuffer width
	 */
	get framebufferWidth(): number {
		return this.serverInit?.framebufferWidth ?? 0;
	}

	/**
	 * Get framebuffer height
	 */
	get framebufferHeight(): number {
		return this.serverInit?.framebufferHeight ?? 0;
	}

	/**
	 * Get current cursor position
	 */
	getCursorPosition(): { x: number; y: number } {
		return { x: this.currentX, y: this.currentY };
	}

	/**
	 * Connect to the VNC server
	 */
	async connect(): Promise<void> {
		if (this.state === 'connected') {
			return;
		}

		if (this.connectPromise) {
			return this.connectPromise;
		}

		this.connectPromise = new Promise((resolve, reject) => {
			this.connectResolve = resolve;
			this.connectReject = reject;
		});

		this.state = 'connecting';

		try {
			this.socket = createConnection({
				host: this.config.host,
				port: this.config.port,
			});

			this.socket.on('connect', () => {
				this.state = 'handshake_version';
				this.reconnectAttempts = 0;
			});

			this.socket.on('data', (data: Buffer) => {
				this.handleData(data);
			});

			this.socket.on('close', () => {
				this.handleDisconnect();
			});

			this.socket.on('error', (err: Error) => {
				this.handleError(err);
			});

			await this.connectPromise;
		} catch (error) {
			this.connectPromise = null;
			this.connectResolve = null;
			this.connectReject = null;
			throw error;
		}
	}

	/**
	 * Disconnect from the VNC server
	 */
	disconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.socket) {
			this.socket.destroy();
			this.socket = null;
		}

		// Reject any pending framebuffer requests
		for (const callback of this.framebufferCallbacks) {
			clearTimeout(callback.timeout);
			callback.reject(new VncConnectionError('Connection closed', 'DISCONNECTED'));
		}
		this.framebufferCallbacks = [];

		this.state = 'disconnected';
		this.serverInit = null;
		this.framebuffer = null;
		this.connectPromise = null;
		this.connectResolve = null;
		this.connectReject = null;
	}

	/**
	 * Ensure connection is established before performing operations
	 */
	private async ensureConnected(): Promise<void> {
		if (this.state !== 'connected') {
			await this.connect();
		}
	}

	/**
	 * Handle incoming data from the socket
	 */
	private handleData(data: Buffer): void {
		this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
		this.processBuffer();
	}

	/**
	 * Process the receive buffer based on current state
	 */
	private processBuffer(): void {
		// Keep processing while we have data and can make progress
		let madeProgress = true;
		while (madeProgress && this.receiveBuffer.length > 0) {
			madeProgress = false;

			switch (this.state) {
				case 'handshake_version':
					if (this.handleVersionHandshake()) {
						madeProgress = true;
					}
					break;

				case 'handshake_security':
					if (this.handleSecurityHandshake()) {
						madeProgress = true;
					}
					break;

				case 'handshake_security_result':
					if (this.handleSecurityResult()) {
						madeProgress = true;
					}
					break;

				case 'initialization':
					if (this.handleServerInit()) {
						madeProgress = true;
					}
					break;

				case 'connected':
					if (this.handleServerMessage()) {
						madeProgress = true;
					}
					break;
			}
		}
	}

	/**
	 * Handle RFB version handshake
	 * Server sends: "RFB 003.008\n" (12 bytes)
	 */
	private handleVersionHandshake(): boolean {
		if (this.receiveBuffer.length < 12) {
			return false;
		}

		const versionString = this.receiveBuffer.subarray(0, 12).toString('ascii');
		this.receiveBuffer = this.receiveBuffer.subarray(12);

		// Validate version string format
		if (!versionString.startsWith('RFB ')) {
			this.handleError(new VncProtocolError(`Invalid version string: ${versionString}`));
			return false;
		}

		// Respond with RFB 003.008 (supports security type list)
		const response = Buffer.from('RFB 003.008\n', 'ascii');
		this.socket?.write(response);
		this.state = 'handshake_security';
		return true;
	}

	/**
	 * Handle security type negotiation
	 * Server sends: 1 byte count, then security type bytes
	 */
	private handleSecurityHandshake(): boolean {
		if (this.receiveBuffer.length < 1) {
			return false;
		}

		const numTypes = this.receiveBuffer.readUInt8(0);

		// Check for connection failure (0 types means error follows)
		if (numTypes === 0) {
			// Error message follows: 4 byte length + message
			if (this.receiveBuffer.length < 5) {
				return false;
			}
			const errorLen = this.receiveBuffer.readUInt32BE(1);
			if (this.receiveBuffer.length < 5 + errorLen) {
				return false;
			}
			const errorMsg = this.receiveBuffer.subarray(5, 5 + errorLen).toString('utf8');
			this.receiveBuffer = this.receiveBuffer.subarray(5 + errorLen);
			this.handleError(
				new VncConnectionError(`Server rejected connection: ${errorMsg}`, 'HANDSHAKE_FAILED'),
			);
			return false;
		}

		if (this.receiveBuffer.length < 1 + numTypes) {
			return false;
		}

		// Read available security types
		const securityTypes: number[] = [];
		for (let i = 0; i < numTypes; i++) {
			securityTypes.push(this.receiveBuffer.readUInt8(1 + i));
		}
		this.receiveBuffer = this.receiveBuffer.subarray(1 + numTypes);

		// Select "None" security (type 1) - we only support no authentication
		if (!securityTypes.includes(SecurityType.NONE)) {
			this.handleError(
				new VncConnectionError(
					`Server requires authentication (types: ${securityTypes.join(', ')}), but only None (1) is supported`,
					'HANDSHAKE_FAILED',
				),
			);
			return false;
		}

		// Send selected security type
		this.socket?.write(Buffer.from([SecurityType.NONE]));
		this.state = 'handshake_security_result';
		return true;
	}

	/**
	 * Handle security result
	 * Server sends: 4 byte result (0 = OK)
	 */
	private handleSecurityResult(): boolean {
		if (this.receiveBuffer.length < 4) {
			return false;
		}

		const result = this.receiveBuffer.readUInt32BE(0);
		this.receiveBuffer = this.receiveBuffer.subarray(4);

		if (result !== 0) {
			// For RFB 3.8, error message follows on failure
			// But for "None" security, failure shouldn't happen
			this.handleError(
				new VncConnectionError(`Security handshake failed with code ${result}`, 'HANDSHAKE_FAILED'),
			);
			return false;
		}

		// Send ClientInit: shared flag (1 = allow other clients)
		this.socket?.write(Buffer.from([1]));
		this.state = 'initialization';
		return true;
	}

	/**
	 * Handle server initialization message
	 * Contains framebuffer dimensions, pixel format, and desktop name
	 */
	private handleServerInit(): boolean {
		// Minimum size: 2 + 2 + 16 + 4 = 24 bytes (before name)
		if (this.receiveBuffer.length < 24) {
			return false;
		}

		const reader = new RfbReader(this.receiveBuffer);

		const framebufferWidth = reader.readUInt16BE();
		const framebufferHeight = reader.readUInt16BE();

		// Read pixel format (16 bytes)
		const bitsPerPixelRaw = reader.readUInt8();
		if (bitsPerPixelRaw !== 8 && bitsPerPixelRaw !== 16 && bitsPerPixelRaw !== 32) {
			this.handleError(new VncProtocolError(`Unsupported bits per pixel: ${bitsPerPixelRaw}`));
			return false;
		}
		// After the check above, bitsPerPixelRaw is guaranteed to be 8, 16, or 32
		const bitsPerPixel: 8 | 16 | 32 = bitsPerPixelRaw;

		const pixelFormat: PixelFormat = {
			bitsPerPixel,
			depth: reader.readUInt8(),
			bigEndian: reader.readUInt8() !== 0,
			trueColor: reader.readUInt8() !== 0,
			redMax: reader.readUInt16BE(),
			greenMax: reader.readUInt16BE(),
			blueMax: reader.readUInt16BE(),
			redShift: reader.readUInt8(),
			greenShift: reader.readUInt8(),
			blueShift: reader.readUInt8(),
		};
		reader.skip(3); // padding

		const nameLength = reader.readUInt32BE();

		// Check if we have the full name
		if (this.receiveBuffer.length < 24 + nameLength) {
			return false;
		}

		const name = reader.readString(nameLength);
		this.receiveBuffer = this.receiveBuffer.subarray(24 + nameLength);

		this.serverInit = {
			framebufferWidth,
			framebufferHeight,
			pixelFormat,
			name,
		};

		// Initialize framebuffer
		this.framebuffer = new Uint8Array(framebufferWidth * framebufferHeight * 4);

		// Send SetEncodings - prefer Raw encoding for simplicity
		this.sendSetEncodings([EncodingType.RAW]);

		this.state = 'connected';

		// Resolve connection promise
		if (this.connectResolve) {
			this.connectResolve();
			this.connectPromise = null;
			this.connectResolve = null;
			this.connectReject = null;
		}

		this.emit('connected');
		return true;
	}

	/**
	 * Handle server messages in connected state
	 */
	private handleServerMessage(): boolean {
		if (this.receiveBuffer.length < 1) {
			return false;
		}

		const messageType = this.receiveBuffer.readUInt8(0);

		switch (messageType) {
			case ServerMessageType.FRAMEBUFFER_UPDATE:
				return this.handleFramebufferUpdate();

			case ServerMessageType.SET_COLOR_MAP_ENTRIES:
				// Skip color map entries (we use true color)
				return this.handleSetColorMapEntries();

			case ServerMessageType.BELL:
				// Bell notification - consume and ignore
				this.receiveBuffer = this.receiveBuffer.subarray(1);
				return true;

			case ServerMessageType.SERVER_CUT_TEXT:
				// Server clipboard - skip for now
				return this.handleServerCutText();

			default:
				// Unknown message type - skip one byte and try again
				this.receiveBuffer = this.receiveBuffer.subarray(1);
				return true;
		}
	}

	/**
	 * Handle framebuffer update message
	 */
	private handleFramebufferUpdate(): boolean {
		// Header: 1 byte type + 1 byte padding + 2 bytes number of rectangles
		if (this.receiveBuffer.length < 4) {
			return false;
		}

		const reader = new RfbReader(this.receiveBuffer);
		reader.skip(1); // message type (already checked)
		reader.skip(1); // padding
		const numRectangles = reader.readUInt16BE();

		// Try to read all rectangles
		let bytesConsumed = 4;

		for (let i = 0; i < numRectangles; i++) {
			// Rectangle header: 2+2+2+2+4 = 12 bytes
			if (this.receiveBuffer.length < bytesConsumed + 12) {
				return false;
			}

			const rectReader = new RfbReader(this.receiveBuffer.subarray(bytesConsumed));
			const header: RectangleHeader = {
				x: rectReader.readUInt16BE(),
				y: rectReader.readUInt16BE(),
				width: rectReader.readUInt16BE(),
				height: rectReader.readUInt16BE(),
				encodingType: rectReader.readInt32BE(),
			};
			bytesConsumed += 12;

			// Handle based on encoding type
			if (header.encodingType === EncodingType.RAW) {
				const bytesPerPixel = this.serverInit?.pixelFormat.bitsPerPixel ?? 32;
				const pixelDataSize = header.width * header.height * (bytesPerPixel / 8);

				if (this.receiveBuffer.length < bytesConsumed + pixelDataSize) {
					return false;
				}

				// Copy pixel data to framebuffer
				const pixelData = this.receiveBuffer.subarray(bytesConsumed, bytesConsumed + pixelDataSize);
				this.updateFramebuffer(header, pixelData);
				bytesConsumed += pixelDataSize;
			} else if (header.encodingType === EncodingType.COPYRECT) {
				// CopyRect: 2+2 = 4 bytes source position
				if (this.receiveBuffer.length < bytesConsumed + 4) {
					return false;
				}
				// Skip CopyRect for now (rarely used)
				bytesConsumed += 4;
			} else if (header.encodingType === EncodingType.DESKTOP_SIZE) {
				// Desktop resize pseudo-encoding - no additional data
				if (this.serverInit) {
					// Update framebuffer dimensions
					const newWidth = header.width;
					const newHeight = header.height;
					this.serverInit = {
						...this.serverInit,
						framebufferWidth: newWidth,
						framebufferHeight: newHeight,
					};
					this.framebuffer = new Uint8Array(newWidth * newHeight * 4);
				}
			}
			// Other encodings: skip with warning
		}

		this.receiveBuffer = this.receiveBuffer.subarray(bytesConsumed);

		// Notify any waiting callbacks
		if (this.framebuffer && this.framebufferCallbacks.length > 0) {
			const callback = this.framebufferCallbacks.shift();
			if (callback) {
				clearTimeout(callback.timeout);
				callback.resolve(new Uint8Array(this.framebuffer));
			}
		}

		this.emit('framebuffer', this.framebuffer ?? new Uint8Array(0));
		return true;
	}

	/**
	 * Update the local framebuffer with received pixel data
	 */
	private updateFramebuffer(header: RectangleHeader, pixelData: Buffer): void {
		if (!this.framebuffer || !this.serverInit) {
			return;
		}

		const pf = this.serverInit.pixelFormat;
		const fbWidth = this.serverInit.framebufferWidth;

		// Convert pixel data to RGBA
		const rgbaData = convertVncPixelData(
			new Uint8Array(pixelData),
			header.width,
			header.height,
			pf.bitsPerPixel,
			pf.redShift,
			pf.greenShift,
			pf.blueShift,
			pf.redMax,
			pf.greenMax,
			pf.blueMax,
			pf.bigEndian,
		);

		// Copy to framebuffer at correct position
		for (let y = 0; y < header.height; y++) {
			const srcOffset = y * header.width * 4;
			const dstOffset = ((header.y + y) * fbWidth + header.x) * 4;
			const rowBytes = header.width * 4;

			for (let i = 0; i < rowBytes; i++) {
				this.framebuffer[dstOffset + i] = rgbaData[srcOffset + i];
			}
		}
	}

	/**
	 * Handle SetColorMapEntries message
	 */
	private handleSetColorMapEntries(): boolean {
		// Header: 1 + 1 + 2 + 2 = 6 bytes, then entries
		if (this.receiveBuffer.length < 6) {
			return false;
		}

		const numColors = this.receiveBuffer.readUInt16BE(4);
		const totalSize = 6 + numColors * 6; // 6 bytes per color (r, g, b as uint16)

		if (this.receiveBuffer.length < totalSize) {
			return false;
		}

		// Skip color map (we use true color)
		this.receiveBuffer = this.receiveBuffer.subarray(totalSize);
		return true;
	}

	/**
	 * Handle ServerCutText message (clipboard)
	 */
	private handleServerCutText(): boolean {
		// Header: 1 + 3 padding + 4 length = 8 bytes
		if (this.receiveBuffer.length < 8) {
			return false;
		}

		const textLength = this.receiveBuffer.readUInt32BE(4);

		if (this.receiveBuffer.length < 8 + textLength) {
			return false;
		}

		// Skip clipboard text for now
		this.receiveBuffer = this.receiveBuffer.subarray(8 + textLength);
		return true;
	}

	/**
	 * Handle connection errors
	 */
	private handleError(error: Error): void {
		// Reject connection promise if pending
		if (this.connectReject) {
			this.connectReject(error);
			this.connectPromise = null;
			this.connectResolve = null;
			this.connectReject = null;
		}

		// Reject framebuffer callbacks
		for (const callback of this.framebufferCallbacks) {
			clearTimeout(callback.timeout);
			callback.reject(error);
		}
		this.framebufferCallbacks = [];

		this.emit('error', error);
	}

	/**
	 * Handle disconnection
	 */
	private handleDisconnect(): void {
		const wasConnected = this.state === 'connected';
		this.state = 'disconnected';
		this.socket = null;

		// Reject connection promise if pending
		if (this.connectReject) {
			this.connectReject(new VncConnectionError('Connection closed', 'DISCONNECTED'));
			this.connectPromise = null;
			this.connectResolve = null;
			this.connectReject = null;
		}

		// Reject framebuffer callbacks
		for (const callback of this.framebufferCallbacks) {
			clearTimeout(callback.timeout);
			callback.reject(new VncConnectionError('Connection closed', 'DISCONNECTED'));
		}
		this.framebufferCallbacks = [];

		this.emit('disconnected');

		// Attempt reconnection if we were previously connected
		if (wasConnected && this.reconnectAttempts < this.config.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay = this.config.reconnectDelay * this.reconnectAttempts;

			this.reconnectTimer = setTimeout(() => {
				this.reconnectTimer = null;
				this.connect().catch((err) => {
					console.error('[VncClient] Reconnection failed:', err);
				});
			}, delay);
		}
	}

	/**
	 * Send SetEncodings message
	 */
	private sendSetEncodings(encodings: readonly number[]): void {
		const writer = new RfbWriter()
			.writeUInt8(ClientMessageType.SET_ENCODINGS)
			.writePadding(1)
			.writeUInt16BE(encodings.length);

		for (const encoding of encodings) {
			writer.writeInt32BE(encoding);
		}

		this.socket?.write(writer.toBuffer());
	}

	/**
	 * Send a pointer (mouse) event
	 */
	async sendPointerEvent(x: number, y: number, buttonMask: number): Promise<void> {
		await this.ensureConnected();

		// Clamp coordinates to framebuffer bounds
		const clampedX = Math.max(0, Math.min(Math.round(x), this.framebufferWidth - 1));
		const clampedY = Math.max(0, Math.min(Math.round(y), this.framebufferHeight - 1));

		const writer = new RfbWriter()
			.writeUInt8(ClientMessageType.POINTER_EVENT)
			.writeUInt8(buttonMask & 0xff)
			.writeUInt16BE(clampedX)
			.writeUInt16BE(clampedY);

		this.socket?.write(writer.toBuffer());

		this.currentX = clampedX;
		this.currentY = clampedY;
	}

	/**
	 * Send a key event
	 */
	async sendKeyEvent(keysym: number, down: boolean): Promise<void> {
		await this.ensureConnected();

		const writer = new RfbWriter()
			.writeUInt8(ClientMessageType.KEY_EVENT)
			.writeUInt8(down ? 1 : 0)
			.writePadding(2)
			.writeUInt32BE(keysym);

		this.socket?.write(writer.toBuffer());
	}

	/**
	 * Request a framebuffer update
	 */
	async requestFramebufferUpdate(
		incremental: boolean = false,
		x: number = 0,
		y: number = 0,
		width?: number,
		height?: number,
	): Promise<void> {
		await this.ensureConnected();

		const w = width ?? this.framebufferWidth;
		const h = height ?? this.framebufferHeight;

		const writer = new RfbWriter()
			.writeUInt8(ClientMessageType.FRAMEBUFFER_UPDATE_REQUEST)
			.writeUInt8(incremental ? 1 : 0)
			.writeUInt16BE(x)
			.writeUInt16BE(y)
			.writeUInt16BE(w)
			.writeUInt16BE(h);

		this.socket?.write(writer.toBuffer());
	}

	/**
	 * Capture a screenshot and return as PNG buffer
	 */
	async captureScreenshot(timeoutMs: number = 10000): Promise<Buffer> {
		await this.ensureConnected();

		// Request full framebuffer update
		await this.requestFramebufferUpdate(false);

		// Wait for framebuffer update
		const framebufferData = await new Promise<Uint8Array>((resolve, reject) => {
			const timeout = setTimeout(() => {
				const index = this.framebufferCallbacks.findIndex((cb) => cb.resolve === resolve);
				if (index >= 0) {
					this.framebufferCallbacks.splice(index, 1);
				}
				reject(new VncConnectionError('Screenshot timeout', 'TIMEOUT'));
			}, timeoutMs);

			this.framebufferCallbacks.push({ resolve, reject, timeout });
		});

		// Encode as PNG
		return encodePng(framebufferData, this.framebufferWidth, this.framebufferHeight);
	}

	/**
	 * Capture a cropped region and return as PNG buffer
	 */
	async captureRegion(
		x: number,
		y: number,
		width: number,
		height: number,
		timeoutMs: number = 10000,
	): Promise<Buffer> {
		await this.ensureConnected();

		// Request full framebuffer update
		await this.requestFramebufferUpdate(false);

		// Wait for framebuffer update
		const framebufferData = await new Promise<Uint8Array>((resolve, reject) => {
			const timeout = setTimeout(() => {
				const index = this.framebufferCallbacks.findIndex((cb) => cb.resolve === resolve);
				if (index >= 0) {
					this.framebufferCallbacks.splice(index, 1);
				}
				reject(new VncConnectionError('Screenshot timeout', 'TIMEOUT'));
			}, timeoutMs);

			this.framebufferCallbacks.push({ resolve, reject, timeout });
		});

		// Crop the region
		const croppedData = cropPixelData(
			framebufferData,
			this.framebufferWidth,
			this.framebufferHeight,
			Math.round(x),
			Math.round(y),
			Math.round(width),
			Math.round(height),
		);

		// Encode as PNG
		return encodePng(croppedData, Math.round(width), Math.round(height));
	}

	/**
	 * Capture and scale a screenshot
	 */
	async captureScreenshotScaled(
		targetWidth: number,
		targetHeight: number,
		timeoutMs: number = 10000,
	): Promise<Buffer> {
		await this.ensureConnected();

		// Request full framebuffer update
		await this.requestFramebufferUpdate(false);

		// Wait for framebuffer update
		const framebufferData = await new Promise<Uint8Array>((resolve, reject) => {
			const timeout = setTimeout(() => {
				const index = this.framebufferCallbacks.findIndex((cb) => cb.resolve === resolve);
				if (index >= 0) {
					this.framebufferCallbacks.splice(index, 1);
				}
				reject(new VncConnectionError('Screenshot timeout', 'TIMEOUT'));
			}, timeoutMs);

			this.framebufferCallbacks.push({ resolve, reject, timeout });
		});

		// Scale the framebuffer
		const scaledData = scalePixelData(
			framebufferData,
			this.framebufferWidth,
			this.framebufferHeight,
			targetWidth,
			targetHeight,
		);

		// Encode as PNG
		return encodePng(scaledData, targetWidth, targetHeight);
	}
}
