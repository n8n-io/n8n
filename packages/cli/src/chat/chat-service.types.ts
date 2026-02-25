import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import { z } from 'zod';

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
	nodeWaitingForChatResponse?: string;
	isPublic: boolean;
	isProcessing: boolean;
	lastHeartbeat?: number;
};

export const chatMessageSchema = z.object({
	sessionId: z.string(),
	action: z.literal('sendMessage'),
	chatInput: z.string(),
	files: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
				data: z.string(),
			}),
		)
		.optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
