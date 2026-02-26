import type { User } from '@n8n/db';

export const LLM_BASE_URL = process.env.N8N_AGENT_LLM_BASE_URL ?? 'https://api.anthropic.com';
export const LLM_MODEL = process.env.N8N_AGENT_LLM_MODEL ?? 'claude-sonnet-4-5-20250929';
export const MAX_ITERATIONS = 15;
export const EXECUTION_TIMEOUT_MS = 120_000;
export const EXTERNAL_AGENT_TIMEOUT_MS = 30_000;

export interface ExternalAgentConfig {
	name: string;
	description?: string;
	url: string;
	apiKey: string;
}

export interface LlmConfig {
	apiKey: string;
	baseUrl: string;
	model: string;
}

export interface LlmMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface TaskStep {
	action: string;
	workflowName?: string;
	toAgent?: string;
	result?: string;
}

export interface IterationBudget {
	remaining: number;
}

export type StepCallback = (event: Record<string, unknown>) => void;

export interface AgentDto {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	avatar: string | null;
	description: string | null;
	agentAccessLevel: string | null;
	apiKey?: string;
}

export interface AgentTaskResult {
	status: string;
	summary?: string;
	steps: TaskStep[];
	message?: string;
}

export const SSE_HEARTBEAT_INTERVAL_MS = 60_000;

export interface SseConnection {
	write: (chunk: string) => void;
	flush?: () => void;
	writableEnded?: boolean;
}

export function sseWrite(res: SseConnection, event: Record<string, unknown>) {
	res.write(`data: ${JSON.stringify(event)}\n\n`);
	res.flush?.();
}

/**
 * Harden an SSE connection for long-running agent tasks.
 * - Disables socket timeout (default ~2m kills long workflows)
 * - Enables TCP keepalive
 * - Sends protocol-level heartbeat every 60s to prevent proxy timeouts
 * - Cleans up on client disconnect
 *
 * Returns a cleanup function that MUST be called when the response ends.
 */
export function hardenSseConnection(
	req: {
		socket: {
			setTimeout: (ms: number) => void;
			setKeepAlive: (enable: boolean) => void;
			setNoDelay: (enable: boolean) => void;
		};
		once: (event: string, cb: () => void) => void;
	},
	res: SseConnection & { once?: (event: string, cb: () => void) => void },
): () => void {
	req.socket.setTimeout(0);
	req.socket.setKeepAlive(true);
	req.socket.setNoDelay(true);

	const heartbeat = setInterval(() => {
		if (!res.writableEnded) {
			res.write(':ping\n\n');
			res.flush?.();
		}
	}, SSE_HEARTBEAT_INTERVAL_MS);

	const cleanup = () => clearInterval(heartbeat);
	req.once('close', cleanup);
	req.once('end', cleanup);
	res.once?.('finish', cleanup);

	return cleanup;
}

/**
 * Scrub known secret values from a message string.
 * Uses the same pattern as CredentialsTester.redactSecrets —
 * replaces full value with `*****` + last 3 chars for debugging.
 */
export function scrubSecrets(message: string, secrets: string[]): string {
	for (const secret of secrets) {
		if (secret && secret.length > 3 && message.includes(secret)) {
			message = message.replaceAll(secret, `*****${secret.slice(-3)}`);
		}
	}
	return message;
}

/**
 * Execute an agent task over SSE. Shared by the REST controller and public API handler.
 * Sets up the SSE connection, streams step events, and writes the final done event.
 */
export async function executeTaskOverSse(
	req: {
		socket: {
			setTimeout: (ms: number) => void;
			setKeepAlive: (enable: boolean) => void;
			setNoDelay: (enable: boolean) => void;
		};
		once: (event: string, cb: () => void) => void;
	},
	res: SseConnection & {
		writeHead: (status: number, headers: Record<string, string>) => void;
		end: () => void;
		once?: (event: string, cb: () => void) => void;
	},
	execute: (onStep: StepCallback) => Promise<AgentTaskResult>,
): Promise<void> {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream; charset=UTF-8',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
	});

	const cleanup = hardenSseConnection(req, res);

	try {
		const result = await execute((event) => sseWrite(res, event));

		sseWrite(res, {
			type: 'done',
			status: result.status,
			summary: result.summary ?? result.message,
		});
	} catch (error) {
		if (!res.writableEnded) {
			const message = error instanceof Error ? error.message : String(error);
			sseWrite(res, { type: 'done', status: 'error', summary: message });
		}
	} finally {
		cleanup();
	}

	res.end();
}

export function toAgentDto(user: User): AgentDto {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		avatar: user.avatar,
		description: user.description,
		agentAccessLevel: user.agentAccessLevel,
	};
}
