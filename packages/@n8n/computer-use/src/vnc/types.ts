/**
 * Type-safe RFB (Remote Framebuffer) protocol types for VNC communication.
 * Based on RFC 6143 - The Remote Framebuffer Protocol
 */

// Client-to-Server message types
export const ClientMessageType = {
	SET_PIXEL_FORMAT: 0,
	SET_ENCODINGS: 2,
	FRAMEBUFFER_UPDATE_REQUEST: 3,
	KEY_EVENT: 4,
	POINTER_EVENT: 5,
	CLIENT_CUT_TEXT: 6,
} as const;

export type ClientMessageTypeValue = (typeof ClientMessageType)[keyof typeof ClientMessageType];

// Server-to-Client message types
export const ServerMessageType = {
	FRAMEBUFFER_UPDATE: 0,
	SET_COLOR_MAP_ENTRIES: 1,
	BELL: 2,
	SERVER_CUT_TEXT: 3,
} as const;

export type ServerMessageTypeValue = (typeof ServerMessageType)[keyof typeof ServerMessageType];

// Encoding types for framebuffer updates
export const EncodingType = {
	RAW: 0,
	COPYRECT: 1,
	RRE: 2,
	HEXTILE: 5,
	ZRLE: 16,
	CURSOR: -239,
	DESKTOP_SIZE: -223,
} as const;

export type EncodingTypeValue = (typeof EncodingType)[keyof typeof EncodingType];

// Pointer button mask bits (for POINTER_EVENT)
export const PointerButton = {
	NONE: 0x00,
	LEFT: 0x01,
	MIDDLE: 0x02,
	RIGHT: 0x04,
	SCROLL_UP: 0x08,
	SCROLL_DOWN: 0x10,
	SCROLL_LEFT: 0x20,
	SCROLL_RIGHT: 0x40,
} as const;

export type PointerButtonValue = (typeof PointerButton)[keyof typeof PointerButton];

// Pixel format structure (16 bytes in protocol)
export interface PixelFormat {
	readonly bitsPerPixel: 8 | 16 | 32;
	readonly depth: number;
	readonly bigEndian: boolean;
	readonly trueColor: boolean;
	readonly redMax: number;
	readonly greenMax: number;
	readonly blueMax: number;
	readonly redShift: number;
	readonly greenShift: number;
	readonly blueShift: number;
}

// Server initialization response
export interface ServerInit {
	readonly framebufferWidth: number;
	readonly framebufferHeight: number;
	readonly pixelFormat: PixelFormat;
	readonly name: string;
}

// Rectangle header in framebuffer update
export interface RectangleHeader {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly encodingType: number;
}

// Rectangle with pixel data
export interface Rectangle {
	readonly header: RectangleHeader;
	readonly pixelData: Uint8Array;
}

// Framebuffer update message
export interface FramebufferUpdate {
	readonly numberOfRectangles: number;
	readonly rectangles: readonly Rectangle[];
}

// Connection state machine states
export type ConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'handshake_version'
	| 'handshake_security'
	| 'handshake_security_result'
	| 'initialization'
	| 'connected';

// VNC client configuration
export interface VncConfig {
	readonly host: string;
	readonly port: number;
	readonly reconnectDelay: number;
	readonly maxReconnectAttempts: number;
}

// Default configuration
export const DEFAULT_VNC_CONFIG: VncConfig = {
	host: 'localhost',
	port: 5900,
	reconnectDelay: 1000,
	maxReconnectAttempts: 10,
} as const;

// Security types
export const SecurityType = {
	INVALID: 0,
	NONE: 1,
	VNC_AUTH: 2,
} as const;

export type SecurityTypeValue = (typeof SecurityType)[keyof typeof SecurityType];

// Custom error classes
export class VncConnectionError extends Error {
	constructor(
		message: string,
		public readonly code: 'CONNECT_FAILED' | 'HANDSHAKE_FAILED' | 'DISCONNECTED' | 'TIMEOUT',
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'VncConnectionError';
	}
}

export class VncProtocolError extends Error {
	constructor(
		message: string,
		public readonly expectedState?: ConnectionState,
		public readonly actualState?: ConnectionState,
	) {
		super(message);
		this.name = 'VncProtocolError';
	}
}
