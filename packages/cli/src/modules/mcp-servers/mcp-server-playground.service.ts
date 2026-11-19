import { randomUUID } from 'node:crypto';

import type { ModelConfig } from '@n8n/agents';
import type {
	McpServerPlaygroundMessageDto,
	McpServerPlaygroundRequestDto,
	McpServerPlaygroundResultDto,
	McpServerPlaygroundToolCallDto,
	McpServerToolInput,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { accountEmail } from './account-label';
import { McpServerRuntimeService, type RuntimeCaller } from './mcp-server-runtime.service';
import { McpServerStoreService } from './mcp-server-store.service';

function inputToZod(input: McpServerToolInput): z.ZodTypeAny {
	const base =
		input.type === 'number'
			? z.number()
			: input.type === 'boolean'
				? z.boolean()
				: input.type === 'object'
					? z.record(z.unknown())
					: input.type === 'array'
						? z.array(z.unknown())
						: z.string();
	const described = input.description ? base.describe(input.description) : base;
	return input.required ? described : described.optional();
}

function resultText(result: unknown): string {
	if (!isRecord(result) || !Array.isArray(result.content)) return '';
	return result.content
		.map((part: unknown) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
		.join('');
}

function parseOutput(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

/**
 * Chat with a model that has only this server's tools. The tools run in process
 * through the runtime, so calls show in the logs with the caller "Playground".
 */
@Service()
export class McpServerPlaygroundService {
	constructor(
		private readonly logger: Logger,
		private readonly store: McpServerStoreService,
		private readonly runtime: McpServerRuntimeService,
	) {}

	async chat(
		user: User,
		serverId: string,
		request: McpServerPlaygroundRequestDto,
	): Promise<McpServerPlaygroundResultDto> {
		const server = await this.store.requireServer(serverId);
		const tools = await this.runtime.listCallableTools(server);
		const caller: RuntimeCaller = {
			type: 'playground',
			label: `${accountEmail(user)} (playground)`,
		};
		const toolCalls: McpServerPlaygroundToolCallDto[] = [];

		let transcript = request.messages
			.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
			.join('\n\n');

		// A confirmation answer: run or decline the waiting call, then let the model continue.
		if (request.confirmation) {
			const { toolCallId, name, input, approved } = request.confirmation;
			const tool = tools.find((candidate) => candidate.name === name);
			if (!tool) {
				transcript += `\n\n[The tool ${name} is no longer on this server.]`;
			} else if (!approved) {
				await this.runtime.record(server, caller, 'Playground', {
					kind: 'tool',
					name,
					status: 'declined',
					input,
					error: 'The person declined the call.',
				});
				toolCalls.push({ id: toolCallId, name, input, status: 'declined' });
				transcript += `\n\n[The person declined the call to ${name}. Nothing ran. Tell them in one sentence.]`;
			} else {
				const result = await this.runtime.runTool(server, tool, input, caller, 'Playground');
				const text = resultText(result);
				toolCalls.push({
					id: toolCallId,
					name,
					input,
					output: parseOutput(text),
					status: result.status ?? 'ok',
					durationMs: result.durationMs,
				});
				transcript += `\n\n[The person approved the call to ${name}. Result: ${text}]`;
			}
		}

		let modelConfig: ModelConfig;
		try {
			const { InstanceAiService } = await import('@/modules/instance-ai/instance-ai.service.js');
			modelConfig = await Container.get(InstanceAiService).resolveAgentModelConfig(user);
		} catch (error) {
			return {
				messages: [],
				unavailableReason: `The playground needs the n8n Assistant model. Set it up in Settings › n8n Assistant. (${ensureError(error).message})`,
			};
		}

		const { createEvalAgent, extractText } = await import('@n8n/instance-ai');
		const { Tool } = await import('@n8n/agents');

		const agent = createEvalAgent('mcp-server-playground', {
			instructions: [
				`You are a test client for the MCP server "${server.name}".`,
				server.description ? `It is for: ${server.description}` : '',
				server.instructions ? `Server instructions:\n${server.instructions}` : '',
				'Use only the tools of this server. Keep answers short.',
				'If a tool result says it waits for a confirmation, stop and tell the person to confirm or cancel in the card below.',
			]
				.filter(Boolean)
				.join('\n\n'),
			resolvedModel: modelConfig,
		});

		for (const tool of tools) {
			const shape = Object.fromEntries(tool.inputs.map((input) => [input.name, inputToZod(input)]));
			agent.tool(
				new Tool(tool.name)
					.description(tool.description)
					.input(z.object(shape))
					.handler(async (input: unknown) => {
						const args = isRecord(input) ? input : {};
						const id = randomUUID();
						if (this.runtime.needsConfirmation(server, tool)) {
							toolCalls.push({
								id,
								name: tool.name,
								input: args,
								status: 'confirm',
								confirmMessage: this.runtime.confirmMessage(server, tool, args),
							});
							return {
								status: 'waiting_for_confirmation',
								message: 'The person must confirm this call in the playground before it runs.',
							};
						}
						const result = await this.runtime.runTool(server, tool, args, caller, 'Playground');
						const text = resultText(result);
						toolCalls.push({
							id,
							name: tool.name,
							input: args,
							output: parseOutput(text),
							status: result.status ?? 'ok',
							durationMs: result.durationMs,
						});
						return parseOutput(text);
					})
					.build(),
			);
		}

		try {
			const result = await agent.generate(transcript);
			const text = extractText(result);
			const message: McpServerPlaygroundMessageDto = {
				role: 'assistant',
				text,
				...(toolCalls.length ? { toolCalls } : {}),
			};
			return { messages: [message] };
		} catch (error) {
			this.logger.warn('MCP servers: playground run failed', { error: ensureError(error).message });
			return {
				messages: [
					{
						role: 'assistant',
						text: `The model call failed: ${ensureError(error).message}`,
						...(toolCalls.length ? { toolCalls } : {}),
					},
				],
			};
		}
	}
}
