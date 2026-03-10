import { Args, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as readline from 'node:readline';

import { BaseCommand } from '../../base-command';
import { ApiError } from '../../client';

function str(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

interface SSEEvent {
	id?: string;
	event?: string;
	data: string;
}

async function* parseSSE(response: Response): AsyncGenerator<SSEEvent> {
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });

			const parts = buffer.split('\n\n');
			buffer = parts.pop()!;

			for (const part of parts) {
				if (!part.trim()) continue;
				const evt: SSEEvent = { data: '' };
				for (const line of part.split('\n')) {
					if (line.startsWith('id:')) evt.id = line.slice(3).trim();
					else if (line.startsWith('event:')) evt.event = line.slice(6).trim();
					else if (line.startsWith('data:')) evt.data += line.slice(5).trim();
				}
				yield evt;
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export default class AiChat extends BaseCommand {
	static override description = 'Chat with the n8n instance AI agent';

	static override examples = [
		'<%= config.bin %> ai chat "list my workflows"',
		'<%= config.bin %> ai chat --thread=abc-123 "follow up question"',
		'<%= config.bin %> ai chat --file=context.md "summarize this"',
		'<%= config.bin %> ai chat  # interactive mode',
	];

	static override args = {
		message: Args.string({
			description: 'Message to send (omit for interactive mode)',
			required: false,
		}),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		thread: Flags.string({ description: 'Resume an existing thread by ID' }),
		file: Flags.string({ description: 'Attach file contents as context' }),
		research: Flags.boolean({ description: 'Enable research mode', default: false }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(AiChat);

		await this.execute(async () => {
			const client = this.getClient(flags);
			const threadId = flags.thread ?? crypto.randomUUID();

			if (args.message) {
				// Single-shot mode
				const message = this.buildMessage(args.message, flags.file);
				await this.sendAndStream(client, threadId, message, flags);
			} else {
				// Interactive mode
				await this.interactive(client, threadId, flags);
			}
		});
	}

	private buildMessage(text: string, filePath?: string): string {
		if (!filePath) return text;
		const content = fs.readFileSync(filePath, 'utf-8');
		return `<context file="${filePath}">\n${content}\n</context>\n\n${text}`;
	}

	private async sendAndStream(
		client: ReturnType<typeof this.getClient>,
		threadId: string,
		message: string,
		flags: { format?: string; research?: boolean; quiet?: boolean },
	): Promise<void> {
		const isJson = flags.format === 'json';

		await client.sendAiMessage(threadId, message, { researchMode: flags.research });
		const response = await client.streamAiEvents(threadId);

		let lastEventId: string | undefined;

		for await (const evt of parseSSE(response)) {
			lastEventId = evt.id ?? lastEventId;

			let payload: Record<string, unknown> = {};
			try {
				payload = JSON.parse(evt.data) as Record<string, unknown>;
			} catch {
				continue;
			}

			const type = (payload.type as string) ?? evt.event;

			if (isJson) {
				process.stdout.write(JSON.stringify(payload) + '\n');
				continue;
			}

			switch (type) {
				case 'text-delta':
					process.stdout.write(str(payload.text));
					break;
				case 'tool-call':
					process.stderr.write(`[tool: ${str(payload.toolName)}]\n`);
					break;
				case 'agent-spawned':
					process.stderr.write(`[agent: ${str(payload.role) || str(payload.agentId)}]\n`);
					break;
				case 'confirmation-request': {
					process.stderr.write(
						`Auto-approved: ${str(payload.toolName)} -- ${str(payload.message)}\n`,
					);
					const requestId = str(payload.requestId) || str(payload.id);
					if (requestId) {
						await client.confirmAiAction(requestId, true);
					}
					break;
				}
				case 'error':
					process.stderr.write(`Error: ${str(payload.content) || str(payload.message)}\n`);
					break;
				case 'run-finish':
					process.stdout.write('\n');
					return;
				default:
					break;
			}
		}

		// Stream ended without run-finish
		process.stdout.write('\n');
	}

	private async interactive(
		client: ReturnType<typeof this.getClient>,
		threadId: string,
		flags: { format?: string; research?: boolean; quiet?: boolean },
	): Promise<void> {
		process.stderr.write(`Thread: ${threadId}\n`);
		process.stderr.write('Type your message. Press Ctrl+C to exit.\n\n');

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stderr,
			prompt: '> ',
		});

		let activeThreadId = threadId;

		const promptUser = () => rl.prompt();

		rl.on('close', () => {
			process.stderr.write('\n');
			process.exit(0);
		});

		promptUser();

		for await (const line of rl) {
			const trimmed = line.trim();
			if (!trimmed) {
				promptUser();
				continue;
			}

			const message = this.buildMessage(trimmed, undefined);

			try {
				await this.sendAndStream(client, activeThreadId, message, flags);
			} catch (error) {
				if (error instanceof ApiError) {
					process.stderr.write(`Error: ${error.message}\n`);
				} else {
					throw error;
				}
			}

			// Keep the same thread for the conversation
			activeThreadId = threadId;
			promptUser();
		}
	}
}
