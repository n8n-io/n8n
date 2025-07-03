import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';

export interface ChatRequest extends IncomingMessage {
	url: string;
	query: {
		sessionId: string;
		executionId: string;
		isPublic?: boolean;
	};
	ws: WebSocket;
}

export type Session = {
	connection: WebSocket;
	executionId: string;
	sessionId: string;
	intervalId: NodeJS.Timeout;
	waitingNodeName?: string;
	isPublic: boolean;
	isProcessing: boolean;
	lastHeartbeat?: number;
};

/**
 *  Message sent by the chat frontends
 *
 *  sessionId - Session ID
 *
 *  action - 'sendMessage';
 *
 *  chatInput - User message
 *
 *  files - Optional files
 *
 * */
export type ChatMessage = {
	sessionId: string;
	action: 'sendMessage';
	chatInput: string;
	files?: Array<{
		name: string;
		type: string;
		data: string;
	}>;
};
