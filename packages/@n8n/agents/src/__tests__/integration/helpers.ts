import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe as _describe } from 'vitest';
import { z } from 'zod';

import {
	Agent,
	type ContentToolCall,
	type ContentToolResult,
	filterLlmMessages,
	Tool,
	type StreamChunk,
	type AgentMessage,
} from '../../index';
import { SqliteMemory } from '../../storage/sqlite-memory';

export type { StreamChunk };

/**
 * Returns `describe` or `describe.skip` depending on whether the API key is set.
 */
export function describeIf(provider: 'anthropic' | 'openai') {
	const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
	return process.env[envVar] ? _describe : _describe.skip;
}

/**
 * Read all chunks from a ReadableStream into an array.
 */
export async function collectStreamChunks(stream: ReadableStream<unknown>): Promise<StreamChunk[]> {
	const chunks: StreamChunk[] = [];
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value as StreamChunk);
	}
	return chunks;
}

/**
 * Filter chunks by type.
 */
export function chunksOfType<T extends StreamChunk['type']>(
	chunks: StreamChunk[],
	type: T,
): Array<StreamChunk & { type: T }> {
	return chunks.filter((c) => c.type === type) as Array<StreamChunk & { type: T }>;
}

/**
 * Get the default model for a provider.
 */
export function getModel(provider: 'anthropic' | 'openai'): string {
	return provider === 'anthropic' ? 'anthropic/claude-haiku-4-5' : 'openai/gpt-4o-mini';
}

/**
 * Create a simple agent with an add_numbers tool for testing.
 */
export function createAgentWithAddTool(provider: 'anthropic' | 'openai'): Agent {
	const addTool = new Tool('add_numbers')
		.description('Add two numbers together and return the result')
		.input(
			z.object({
				a: z.number().describe('First number'),
				b: z.number().describe('Second number'),
			}),
		)
		.output(
			z.object({
				result: z.number().describe('The sum'),
			}),
		)
		.handler(async ({ a, b }) => ({ result: a + b }));

	return new Agent('test-agent')
		.model(getModel(provider))
		.instructions(
			'You are a calculator. When asked to add numbers, use the add_numbers tool. Be concise.',
		)
		.tool(addTool);
}

/**
 * Create an agent with a tool that can suspend (interrupt) for confirmation.
 */
export function createAgentWithInterruptibleTool(provider: 'anthropic' | 'openai'): Agent {
	const deleteTool = new Tool('delete_file')
		.description('Delete a file at the given path')
		.input(z.object({ path: z.string().describe('File path to delete') }))
		.output(z.object({ deleted: z.boolean(), path: z.string() }))
		.suspend(z.object({ message: z.string(), severity: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ path }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
			}
			if (!ctx.resumeData.approved) return { deleted: false, path };
			return { deleted: true, path };
		});

	return new Agent('test-interrupt-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. When asked to delete a file, use the delete_file tool. Be concise.',
		)
		.tool(deleteTool)
		.checkpoint('memory');
}

/**
 * Create an agent with two tools — one interruptible, one not.
 */
export function createAgentWithMixedTools(provider: 'anthropic' | 'openai'): Agent {
	const listTool = new Tool('list_files')
		.description('List files in a directory')
		.input(z.object({ dir: z.string().describe('Directory path') }))
		.handler(async ({ dir }) => ({
			files: ['readme.md', 'index.ts', 'package.json'],
			dir,
		}));

	const deleteTool = new Tool('delete_file')
		.description('Delete a file at the given path — dangerous operation')
		.input(z.object({ path: z.string().describe('File path to delete') }))
		.output(z.object({ deleted: z.boolean(), path: z.string() }))
		.suspend(z.object({ message: z.string(), severity: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ path }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
			}
			if (!ctx.resumeData.approved) return { deleted: false, path };
			return { deleted: true, path };
		});

	return new Agent('test-mixed-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. Use list_files to list and delete_file to delete. Be concise.',
		)
		.tool(listTool)
		.tool(deleteTool)
		.checkpoint('memory');
}

/**
 * Create an agent with a tool that uses `.toContent()` to emit a custom message.
 * The tool adds two numbers; toContent produces a text MessageContent visible to the
 * user but never forwarded to the LLM.
 */
export function createAgentWithToContentTool(provider: 'anthropic' | 'openai'): Agent {
	const calcTool = new Tool('add_numbers')
		.description('Add two numbers together and return the result')
		.input(
			z.object({
				a: z.number().describe('First number'),
				b: z.number().describe('Second number'),
			}),
		)
		.output(z.object({ result: z.number().describe('The sum') }))
		.handler(async ({ a, b }) => ({ result: a + b }))
		.toMessage((output) => ({
			type: 'custom',
			messageType: '___dummyCustomMessage',
			data: {
				dummy: `dummy message. Tool output ${output.result}`,
			},
		}));

	return new Agent('test-to-content-agent')
		.model(getModel(provider))
		.instructions(
			'You are a calculator. When asked to add numbers, use the add_numbers tool. Be concise.',
		)
		.tool(calcTool);
}

/**
 * Create an agent with one interruptible tool designed for parallel-call
 * scenarios. The tool only deletes one file at a time, and the instructions
 * strongly encourage parallel tool calling.
 */
export function createAgentWithParallelInterruptibleCalls(provider: 'anthropic' | 'openai'): Agent {
	const deleteTool = new Tool('delete_file')
		.description('Delete a single file at the given path. Can only delete one file per call.')
		.input(z.object({ path: z.string().describe('File path to delete') }))
		.output(z.object({ deleted: z.boolean(), path: z.string() }))
		.suspend(z.object({ message: z.string(), severity: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ path }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
			}
			if (!ctx.resumeData.approved) return { deleted: false, path };
			return { deleted: true, path };
		});

	return new Agent('test-parallel-interrupt-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. When asked to delete multiple files, you MUST call delete_file for EACH file using parallel tool calls in the same turn. Never skip a file.',
		)
		.tool(deleteTool)
		.checkpoint('memory');
}

/**
 * Create an agent with concurrent tool execution and an interruptible tool.
 * Uses `toolCallConcurrency(Infinity)` so all tool calls in a single LLM turn
 * are executed concurrently. Suspensions do not block subsequent tool calls.
 */
export function createAgentWithConcurrentInterruptibleCalls(
	provider: 'anthropic' | 'openai',
): Agent {
	const deleteTool = new Tool('delete_file')
		.description('Delete a single file at the given path. Can only delete one file per call.')
		.input(z.object({ path: z.string().describe('File path to delete') }))
		.output(z.object({ deleted: z.boolean(), path: z.string() }))
		.suspend(z.object({ message: z.string(), severity: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ path }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
			}
			if (!ctx.resumeData.approved) return { deleted: false, path };
			return { deleted: true, path };
		});

	return new Agent('test-concurrent-interrupt-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. When asked to delete multiple files, you MUST call delete_file for EACH file using parallel tool calls in the same turn. Never skip a file.',
		)
		.tool(deleteTool)
		.toolCallConcurrency(Infinity)
		.checkpoint('memory');
}

/**
 * Create an agent with concurrent tool execution mixing interruptible and
 * non-interruptible tools. `list_files` runs immediately; `delete_file` suspends.
 */
export function createAgentWithConcurrentMixedTools(provider: 'anthropic' | 'openai'): Agent {
	const listTool = new Tool('list_files')
		.description('List files in a directory')
		.input(z.object({ dir: z.string().describe('Directory path') }))
		.handler(async ({ dir }) => ({
			files: ['readme.md', 'index.ts', 'package.json'],
			dir,
		}));

	const deleteTool = new Tool('delete_file')
		.description('Delete a file at the given path — dangerous operation')
		.input(z.object({ path: z.string().describe('File path to delete') }))
		.output(z.object({ deleted: z.boolean(), path: z.string() }))
		.suspend(z.object({ message: z.string(), severity: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ path }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
			}
			if (!ctx.resumeData.approved) return { deleted: false, path };
			return { deleted: true, path };
		});

	return new Agent('test-concurrent-mixed-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. Use list_files to list and delete_file to delete. Be concise.',
		)
		.tool(listTool)
		.tool(deleteTool)
		.toolCallConcurrency(Infinity)
		.checkpoint('memory');
}

/**
 * Create an agent with bounded concurrency and an interruptible tool.
 * Uses `toolCallConcurrency(concurrency)` to control batching.
 */
export function createAgentWithBatchedInterruptibleCalls(
	provider: 'anthropic' | 'openai',
	concurrency: number,
): Agent {
	const deleteTool = new Tool('delete_file')
		.description('Delete a single file at the given path. Can only delete one file per call.')
		.input(z.object({ path: z.string().describe('File path to delete') }))
		.output(z.object({ deleted: z.boolean(), path: z.string() }))
		.suspend(z.object({ message: z.string(), severity: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ path }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
			}
			if (!ctx.resumeData.approved) return { deleted: false, path };
			return { deleted: true, path };
		});

	return new Agent('test-batched-interrupt-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. When asked to delete multiple files, you MUST call delete_file for EACH file using parallel tool calls in the same turn. Never skip a file.',
		)
		.tool(deleteTool)
		.toolCallConcurrency(concurrency)
		.checkpoint('memory');
}

/**
 * Create an agent with bounded concurrency and a non-interruptible tool.
 */
export function createAgentWithBatchedNormalCalls(
	provider: 'anthropic' | 'openai',
	concurrency: number,
): Agent {
	const checkTool = new Tool('check_file')
		.description('Check if a file exists at the given path. Can only check one file per call.')
		.input(z.object({ path: z.string().describe('File path to check') }))
		.output(z.object({ exists: z.boolean(), path: z.string() }))
		.handler(async ({ path }) => ({ exists: true, path }));

	return new Agent('test-batched-normal-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. When asked to check multiple files, you MUST call check_file for EACH file using parallel tool calls in the same turn. Never skip a file. After checking, summarize the results concisely.',
		)
		.tool(checkTool)
		.toolCallConcurrency(concurrency)
		.checkpoint('memory');
}

/**
 * Create an agent with a tool that always throws an error.
 * Used to verify that tool errors surface as LLM-visible messages.
 */
export function createAgentWithAlwaysErrorTool(provider: 'anthropic' | 'openai'): Agent {
	const brokenTool = new Tool('broken_tool')
		.description('Fetch data from a remote service')
		.input(z.object({ id: z.string().describe('Resource ID to fetch') }))
		.handler(async () => {
			throw new Error('Service unavailable: connection timeout');
		});

	return new Agent('test-error-agent')
		.model(getModel(provider))
		.instructions(
			'You are a data fetcher. Use broken_tool to fetch data. ' +
				'If the tool fails, acknowledge the error in your response and explain what happened. Be concise.',
		)
		.tool(brokenTool);
}

/**
 * Create an agent with a tool that fails on the first call and succeeds on the second.
 * Used to verify that the LLM can self-correct by retrying after seeing the error result.
 */
export function createAgentWithFlakyTool(provider: 'anthropic' | 'openai'): {
	agent: Agent;
	callCount: () => number;
} {
	let calls = 0;

	const flakyTool = new Tool('fetch_data')
		.description('Fetch data. May fail on the first attempt — retry if it does.')
		.input(z.object({ id: z.string().describe('Resource ID to fetch') }))
		.output(z.object({ id: z.string(), value: z.number() }))
		.handler(async ({ id }) => {
			calls++;
			if (calls === 1) throw new Error('Transient error: rate limit exceeded, please retry');
			return { id, value: 42 };
		});

	const agent = new Agent('test-flaky-agent')
		.model(getModel(provider))
		.instructions(
			'You are a data fetcher. Use fetch_data to fetch data. ' +
				'If the tool fails with a transient error, retry the SAME call once. Be concise.',
		)
		.tool(flakyTool);

	return { agent, callCount: () => calls };
}

export const findLastTextContent = (messages: AgentMessage[]): string | undefined => {
	return filterLlmMessages(messages)
		.reverse()
		.find((m) => m.content.find((c) => c.type === 'text'))
		?.content.find((c) => c.type === 'text')?.text;
};

export const findLastToolCallContent = (messages: AgentMessage[]): ContentToolCall | undefined => {
	return filterLlmMessages(messages)
		.reverse()
		.find((m) => m.content.find((c) => c.type === 'tool-call'))
		?.content.find((c) => c.type === 'tool-call');
};

export const findAllToolCalls = (messages: AgentMessage[]): ContentToolCall[] => {
	return filterLlmMessages(messages)
		.filter((m) => m.content.find((c) => c.type === 'tool-call'))
		.map((m) => m.content.filter((c) => c.type === 'tool-call'))
		.flat();
};
export const findAllToolResults = (messages: AgentMessage[]): ContentToolResult[] => {
	return filterLlmMessages(messages)
		.filter((m) => m.content.find((c) => c.type === 'tool-result'))
		.map((m) => m.content.find((c) => c.type === 'tool-result') as ContentToolResult);
};
export const collectTextDeltas = (chunks: StreamChunk[]): string => {
	return chunks
		.filter((c) => c.type === 'text-delta')
		.map((c) => c.delta)
		.join('');
};

export function createSqliteMemory(): {
	memory: SqliteMemory;
	cleanup: () => void;
	url: string;
} {
	const dbPath = path.join(
		os.tmpdir(),
		`test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
	);
	const url = `file:${dbPath}`;
	const memory = new SqliteMemory({ url });
	return {
		memory,
		url,
		cleanup: () => {
			try {
				fs.unlinkSync(dbPath);
			} catch {
				// File may already be removed — ignore
			}
		},
	};
}
