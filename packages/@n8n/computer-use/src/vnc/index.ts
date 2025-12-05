/**
 * VNC module - Pure TypeScript RFB protocol implementation
 */

// Types
export type {
	PixelFormat,
	ServerInit,
	RectangleHeader,
	Rectangle,
	FramebufferUpdate,
	ConnectionState,
	VncConfig,
} from './types';

export {
	ClientMessageType,
	ServerMessageType,
	EncodingType,
	PointerButton,
	SecurityType,
	DEFAULT_VNC_CONFIG,
	VncConnectionError,
	VncProtocolError,
} from './types';

// Protocol helpers
export { RfbReader, RfbWriter } from './protocol';

// Keysym mapping
export { KEYSYM, charToKeysym, keyNameToKeysym, parseKeySpec, textToKeysyms } from './keysym';
export type { ParsedKey } from './keysym';

// Framebuffer utilities
export { encodePng, convertVncPixelData, cropPixelData, scalePixelData } from './framebuffer';

// VNC client
export { VncClient } from './client';
