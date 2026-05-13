import { Command } from '@n8n/decorators';
import { UnexpectedError, UserError } from 'n8n-workflow';
import readline from 'node:readline/promises';
import { z } from 'zod';

import { removeTrailingSlash } from '@/utils';

import { BaseCommand } from './base-command';

type SseFrame = {
	event: string;
	data?: string;
};

type ThreadMessage = {
	role?: string;
	content?: string;
};

type ThreadMessagesResponse = {
	threadId: string;
	messages: ThreadMessage[];
	nextEventId?: number;
};

const flagsSchema = z.object({
	prompt: z.string().alias('p').describe('Prompt to send to Instance AI').optional(),
	baseUrl: z
		.string()
		.describe('Base URL of a running n8n instance')
		.default('http://localhost:5678'),
	apiKey: z
		.string()
		.describe('n8n API key used as x-n8n-api-key header (or set N8N_API_KEY)')
		.optional(),
	threadId: z.string().uuid().describe('Existing thread ID to continue').optional(),
	researchMode: z.boolean().describe('Enable research mode for this prompt').optional(),
	timeout: z.number().int().positive().describe('Timeout in milliseconds').default(180000),
});

@Command({
	name: 'ai',
	description: 'Send a prompt to Instance AI, or start interactive mode when --prompt is omitted',
	examples: [
		'--apiKey <api-key>',
		'--prompt "Build a workflow that fetches top Hacker News stories"',
		'--prompt "Summarize this thread" --threadId <thread-id>',
	],
	flagsSchema,
})
export class AiCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	private apiKey = '';

	private restBaseUrl = '';

	override async init() {
		// Intentionally skip BaseCommand.init() — this command talks to an already
		// running n8n instance over HTTP and should not boot another local instance.
	}

	async run() {
		const { flags } = this;
		this.apiKey = flags.apiKey ?? process.env.N8N_API_KEY ?? '';

		if (!this.apiKey) {
			throw new UserError('Missing API key. Provide --apiKey or set N8N_API_KEY.');
		}

		this.restBaseUrl = `${removeTrailingSlash(flags.baseUrl)}/rest/instance-ai`;

		const threadId = await this.ensureThread(flags.threadId);
		if (flags.threadId) {
			await this.loadAndPrintThreadHistory(threadId);
		}

		if (flags.prompt) {
			await this.executePrompt(threadId, flags.prompt, flags.researchMode, flags.timeout);
			return;
		}

		await this.runInteractiveShell(threadId, flags.researchMode, flags.timeout);
	}

	async catch(error: Error) {
		this.logger.error(error.message);
	}

	override async finally(error?: Error) {
		process.exit(error ? 1 : 0);
	}

	private async ensureThread(providedThreadId?: string): Promise<string> {
		type EnsureThreadResponse = {
			thread?: {
				id?: string;
			};
		};

		const payload = providedThreadId ? { threadId: providedThreadId } : {};
		const response = await this.requestJson<EnsureThreadResponse>('POST', '/threads', payload);
		const threadId = response.thread?.id;

		if (!threadId) {
			throw new UnexpectedError('Failed to get thread ID from instance-ai/threads response');
		}

		return threadId;
	}

	private async startRun(
		threadId: string,
		prompt: string,
		researchMode?: boolean,
	): Promise<string> {
		type StartRunResponse = {
			runId?: string;
		};

		const response = await this.requestJson<StartRunResponse>('POST', `/chat/${threadId}`, {
			message: prompt,
			researchMode,
		});

		if (!response.runId) {
			throw new UnexpectedError('Failed to get run ID from instance-ai/chat response');
		}

		return response.runId;
	}

	private async waitForRun(
		threadId: string,
		runId: string,
		timeoutMs: number,
	): Promise<'completed' | 'cancelled' | 'failed' | 'confirmation-required'> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(`${this.restBaseUrl}/events/${threadId}`, {
				method: 'GET',
				headers: this.authHeaders(),
				signal: controller.signal,
			});

			if (!response.ok) {
				throw await this.toHttpError(response, 'Failed to open Instance AI event stream');
			}

			if (!response.body) {
				throw new UnexpectedError('Instance AI event stream did not return a response body');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				let boundary = buffer.indexOf('\n\n');

				while (boundary !== -1) {
					const rawFrame = buffer.slice(0, boundary);
					buffer = buffer.slice(boundary + 2);
					boundary = buffer.indexOf('\n\n');

					const frame = this.parseSseFrame(rawFrame);
					if (!frame.data || frame.event === 'run-sync') continue;

					const event = this.tryParseEvent(frame.data);
					if (!event || event.runId !== runId) continue;

					if (event.type === 'text-delta') {
						const text = this.getTextDelta(event);
						if (text) process.stdout.write(text);
						continue;
					}

					if (event.type === 'confirmation-request') {
						return 'confirmation-required';
					}

					if (event.type === 'error') {
						throw new UserError(this.getEventErrorMessage(event));
					}

					if (event.type === 'run-finish') {
						const status = this.getRunFinishStatus(event);
						if (status) return status;
					}
				}
			}

			throw new UnexpectedError('Instance AI event stream closed before run completed');
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				await this.cancelRun(threadId);
				throw new UserError(`Timed out waiting for run completion after ${timeoutMs}ms`);
			}
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}

	private async cancelRun(threadId: string) {
		const response = await fetch(`${this.restBaseUrl}/chat/${threadId}/cancel`, {
			method: 'POST',
			headers: this.authHeaders(),
		});

		if (!response.ok) {
			this.logger.warn('Failed to cancel timed-out run');
		}
	}

	private async executePrompt(
		threadId: string,
		prompt: string,
		researchMode: boolean | undefined,
		timeoutMs: number,
	): Promise<void> {
		const runId = await this.startRun(threadId, prompt, researchMode);
		const result = await this.waitForRun(threadId, runId, timeoutMs);

		if (result === 'confirmation-required') {
			this.logger.info('');
			this.logger.info('Run paused: user confirmation is required in the n8n UI.');
			this.logger.info(`Thread ID: ${threadId}`);
			this.logger.info(`Run ID: ${runId}`);
			return;
		}

		if (result !== 'completed') {
			throw new UserError(`Instance AI run finished with status: ${result}`);
		}

		process.stdout.write('\n');
	}

	private async runInteractiveShell(
		startingThreadId: string,
		researchMode: boolean | undefined,
		timeoutMs: number,
	): Promise<void> {
		if (!process.stdin.isTTY || !process.stdout.isTTY) {
			throw new UserError(
				'Interactive mode requires a TTY. Use --prompt in non-interactive environments.',
			);
		}

		const terminal = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		let threadId = startingThreadId;
		this.logger.info('');
		this.logger.info(`Interactive mode started (thread: ${threadId}).`);
		this.logger.info('Commands: /exit, /quit, /new, /thread, /thread <thread-id>');

		try {
			while (true) {
				const input = (await terminal.question('You: ')).trim();
				if (!input) continue;

				const [command, ...args] = input.split(/\s+/);
				const normalized = command.toLowerCase();
				if (normalized === '/exit' || normalized === '/quit') {
					break;
				}

				if (normalized === '/new') {
					threadId = await this.ensureThread();
					this.logger.info(`Started new thread: ${threadId}`);
					continue;
				}

				if (normalized === '/thread') {
					if (args.length > 0) {
						threadId = await this.ensureThread(args[0]);
						this.logger.info(`Switched thread: ${threadId}`);
						await this.loadAndPrintThreadHistory(threadId);
						continue;
					}

					this.logger.info(`Current thread: ${threadId}`);
					continue;
				}

				process.stdout.write('AI: ');
				await this.executePrompt(threadId, input, researchMode, timeoutMs);
			}
		} finally {
			terminal.close();
		}
	}

	private async loadAndPrintThreadHistory(threadId: string): Promise<void> {
		const history = await this.requestJson<ThreadMessagesResponse>(
			'GET',
			`/threads/${encodeURIComponent(threadId)}/messages?limit=100`,
		);

		if (!history.messages.length) return;

		this.logger.info('');
		this.logger.info(
			`Loaded ${history.messages.length} previous message(s) from thread ${threadId}:`,
		);

		for (const message of history.messages) {
			if (!message.content || message.content.trim().length === 0) continue;

			const role = message.role === 'assistant' ? 'Assistant' : 'User';
			this.logger.info(`${role}: ${message.content}`);
		}

		this.logger.info('');
	}

	private parseSseFrame(rawFrame: string): SseFrame {
		const lines = rawFrame.replaceAll('\r', '').split('\n');
		let event = 'message';
		const dataParts: string[] = [];

		for (const line of lines) {
			if (line.startsWith(':')) continue;
			if (line.startsWith('event:')) {
				event = line.slice(6).trim();
				continue;
			}
			if (line.startsWith('data:')) {
				dataParts.push(line.slice(5).trimStart());
			}
		}

		return {
			event,
			data: dataParts.length > 0 ? dataParts.join('\n') : undefined,
		};
	}

	private tryParseEvent(value: string): { type: string; runId?: string; payload?: unknown } | null {
		try {
			const parsed: unknown = JSON.parse(value);
			if (!parsed || typeof parsed !== 'object') return null;

			const candidate = parsed as {
				type?: unknown;
				runId?: unknown;
				payload?: unknown;
			};

			if (typeof candidate.type !== 'string') return null;

			return {
				type: candidate.type,
				runId: typeof candidate.runId === 'string' ? candidate.runId : undefined,
				payload: candidate.payload,
			};
		} catch {
			return null;
		}
	}

	private getTextDelta(event: { payload?: unknown }): string | null {
		if (!event.payload || typeof event.payload !== 'object') return null;
		const payload = event.payload as { text?: unknown };
		return typeof payload.text === 'string' ? payload.text : null;
	}

	private getEventErrorMessage(event: { payload?: unknown }): string {
		if (!event.payload || typeof event.payload !== 'object') {
			return 'Instance AI run failed';
		}

		const payload = event.payload as { content?: unknown };
		if (typeof payload.content === 'string' && payload.content.length > 0) {
			return payload.content;
		}

		return 'Instance AI run failed';
	}

	private getRunFinishStatus(event: {
		payload?: unknown;
	}): 'completed' | 'cancelled' | 'failed' | null {
		if (!event.payload || typeof event.payload !== 'object') return null;
		const payload = event.payload as { status?: unknown };
		return payload.status === 'completed' ||
			payload.status === 'cancelled' ||
			payload.status === 'failed'
			? payload.status
			: null;
	}

	private authHeaders(contentType = false): Record<string, string> {
		return {
			'x-n8n-api-key': this.apiKey,
			...(contentType ? { 'content-type': 'application/json' } : {}),
		};
	}

	private async requestJson<T>(method: 'POST' | 'GET', path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${this.restBaseUrl}${path}`, {
			method,
			headers: this.authHeaders(body !== undefined),
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			throw await this.toHttpError(response, `Request failed: ${method} ${path}`);
		}

		const parsed = (await response.json()) as unknown;
		if (parsed && typeof parsed === 'object' && 'data' in parsed) {
			return (parsed as { data: T }).data;
		}

		return parsed as T;
	}

	private async toHttpError(response: Response, messagePrefix: string): Promise<UserError> {
		const responseText = await response.text();
		const hint =
			response.status === 401 || response.status === 403
				? 'Check your API key and required scopes (instanceAi:message).'
				: response.status === 404
					? 'Check base URL and that Instance AI is enabled on the target instance.'
					: undefined;

		return new UserError(
			`${messagePrefix} (HTTP ${response.status})${
				hint ? ` ${hint}` : ''
			}${responseText ? ` Response: ${responseText}` : ''}`,
		);
	}
}
