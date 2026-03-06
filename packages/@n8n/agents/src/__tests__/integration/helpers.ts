import { describe as _describe } from 'vitest';
import { z } from 'zod';

import { Agent, Tool, type Message, type StreamChunk } from '../../index';

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
export function chunksOfType(chunks: StreamChunk[], type: string): StreamChunk[] {
	return chunks.filter((c) => c.type === type);
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
 * Create an agent with a tool that requires approval.
 */
export function createAgentWithApprovalTool(provider: 'anthropic' | 'openai'): Agent {
	const deleteTool = new Tool('delete_file')
		.description('Delete a file at the given path')
		.input(
			z.object({
				path: z.string().describe('File path to delete'),
			}),
		)
		.handler(async ({ path }) => ({ deleted: true, path }))
		.requiresApproval();

	return new Agent('test-approval-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. When asked to delete a file, use the delete_file tool. Be concise.',
		)
		.tool(deleteTool)
		.checkpoint('memory');
}

/**
 * Create an agent with two tools — one requiring approval, one not.
 */
export function createAgentWithMixedTools(provider: 'anthropic' | 'openai'): Agent {
	const listTool = new Tool('list_files')
		.description('List files in a directory')
		.input(
			z.object({
				dir: z.string().describe('Directory path'),
			}),
		)
		.handler(async ({ dir }) => ({
			files: ['readme.md', 'index.ts', 'package.json'],
			dir,
		}));

	const deleteTool = new Tool('delete_file')
		.description('Delete a file at the given path — dangerous operation')
		.input(
			z.object({
				path: z.string().describe('File path to delete'),
			}),
		)
		.handler(async ({ path }) => ({ deleted: true, path }))
		.requiresApproval();

	return new Agent('test-mixed-agent')
		.model(getModel(provider))
		.instructions(
			'You are a file manager. Use list_files to list and delete_file to delete. Be concise.',
		)
		.tool(listTool)
		.tool(deleteTool)
		.checkpoint('memory');
}

export const findTextContent = (messages: Message[]): string | undefined => {
	return messages
		.find((m) => m.content.find((c) => c.type === 'text'))
		?.content.find((c) => c.type === 'text')?.text;
};
