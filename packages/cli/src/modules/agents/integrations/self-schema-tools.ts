import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { ToolDescriptor } from '../tool-repository';

/**
 * Tool that returns the agent's current TypeScript source code.
 * The agent reads this before modifying itself so it has full context.
 */
export function createGetMyCodeTool(getCode: () => Promise<string>) {
	return new Tool('get_my_code')
		.description(
			"Return this agent's current TypeScript source code. " +
				'Call this before modifying yourself so you have the full context.',
		)
		.input(z.object({}))
		.handler(async () => {
			const code = await getCode();
			return { code };
		});
}

/**
 * Tool that compiles and validates proposed TypeScript agent code.
 * Mirrors the builder agent's typecheck tool — call this before set_code.
 */
export function createTypecheckTool(
	validate: (code: string) => Promise<{ ok: boolean; error: string | null }>,
) {
	return new Tool('typecheck')
		.description(
			'Compile and validate TypeScript agent code. ' +
				'Returns { ok: true } if the code is valid, or { ok: false, error: string } with the error. ' +
				'Always call this before set_code.',
		)
		.input(
			z.object({
				code: z.string().describe('The full TypeScript source code to validate'),
			}),
		)
		.handler(async ({ code }: { code: string }) => validate(code));
}

/**
 * Tool that saves the agent's new TypeScript source code.
 * Mirrors the builder agent's set_code tool.
 * Only call this after typecheck passes.
 */
export function createSetCodeTool(setCode: (code: string) => Promise<void>) {
	return new Tool('set_code')
		.description(
			'Save the new TypeScript source code for this agent. ' +
				'Call this with the COMPLETE, final code only after typecheck passes. ' +
				'The change takes effect on the next conversation turn.',
		)
		.input(
			z.object({
				code: z.string().describe('The complete TypeScript agent source code'),
			}),
		)
		.handler(async ({ code }: { code: string }) => {
			await setCode(code);
			return { ok: true };
		});
}

/**
 * Tool that returns the list of n8n node tools the agent can add to itself.
 * The credential provider is used to filter to tools the user actually has
 * credentials configured for.
 */
export function createListToolsTool(listTools: () => Promise<ToolDescriptor[]>) {
	return new Tool('list_tools')
		.description(
			'List the n8n node tools available to add to this agent. ' +
				'Each entry includes: name (display name), nodeType (the type identifier to use in code), ' +
				'nodeTypeVersion, description, hasCredentials, and credentials (array of { slot, id, name } ' +
				'for any credentials the user has configured). ' +
				'To add a tool, call get_my_code, insert a ToolFromNode block, then typecheck and set_code. ' +
				'Example ToolFromNode usage:\n' +
				"  import { ToolFromNode } from '@n8n/agents-utils';\n" +
				"  import { node } from '@n8n/workflow-sdk';\n" +
				"  import { z } from 'zod';\n" +
				'  // Then in the agent chain:\n' +
				"  .tool(new ToolFromNode(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2,\n" +
				"    config: { parameters: { url: '={{ $json.url }}' } } }))\n" +
				"    .name('fetch_webpage').description('Fetch a URL')\n" +
				"    .input(z.object({ url: z.string().describe('URL to fetch') })))\n" +
				'For nodes that need credentials, include config.credentials using slot/id/name from this list.',
		)
		.input(z.object({}))
		.handler(async () => {
			const tools = await listTools();
			return { tools };
		});
}

export interface AddToolParameter {
	description: string;
	type?: 'string' | 'number' | 'boolean';
	required?: boolean;
}

export interface AddToolArgs {
	nodeType: string;
	nodeTypeVersion: number;
	name: string;
	description: string;
	/** Node parameter values. Use n8n expressions like ={{ $json.url }} to map agent inputs. */
	nodeParameters?: Record<string, unknown>;
	/**
	 * Input parameters the LLM will provide when calling this tool.
	 * Each key becomes a $json.<key> expression usable in nodeParameters.
	 */
	parameters?: Record<string, AddToolParameter>;
}

/**
 * Tool that adds an n8n node tool to the agent without requiring the agent to
 * write ToolFromNode TypeScript manually. The server handles schema patching
 * and code generation.
 */
export function createAddToolTool(addTool: (args: AddToolArgs) => Promise<void>) {
	return new Tool('add_tool')
		.description(
			'Add an n8n node tool to this agent. ' +
				'Call list_tools first to find available tools and their nodeTypeVersion. ' +
				'This is the correct way to add node tools — do NOT write ToolFromNode code manually.',
		)
		.input(
			z.object({
				nodeType: z.string().describe('Node type identifier, e.g. "n8n-nodes-base.httpRequest"'),
				nodeTypeVersion: z.number().describe('Node type version from list_tools'),
				name: z.string().describe('Tool name the agent will use when calling it'),
				description: z.string().describe('What this tool does'),
				nodeParameters: z
					.record(z.unknown())
					.optional()
					.describe(
						'Node parameter values. Use n8n expressions like ={{ $json.url }} to map agent inputs to node fields. ' +
							'Example for HTTP Request: { "url": "={{ $json.url }}", "method": "={{ $json.method || \\"GET\\" }}" }',
					),
				parameters: z
					.record(
						z.object({
							description: z.string().describe('What this parameter is for'),
							type: z
								.enum(['string', 'number', 'boolean'])
								.optional()
								.describe('Parameter type, defaults to string'),
							required: z
								.boolean()
								.optional()
								.describe('Whether the LLM must provide this parameter, defaults to true'),
						}),
					)
					.optional()
					.describe(
						'Input parameters the LLM provides when calling this tool. ' +
							'Each key is available as $json.<key> in nodeParameters expressions. ' +
							'Example: { "url": { "description": "URL to fetch", "type": "string" } }',
					),
			}),
		)
		.handler(async (args: AddToolArgs) => {
			await addTool(args);
			return { ok: true };
		});
}
