import type { CallToolResult } from '@modelcontextprotocol/server';
import { User } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';
import z from 'zod';

import type { RegisterToolFn, ToolDefinition, ToolHandlerResult } from '@/modules/mcp/mcp.types';

import {
	type CapabilityContext,
	type CapabilitySurface,
	type CapabilityToolDefinition,
	DEFAULT_CAPABILITY_SURFACES,
	defineCapability,
} from '../capability';

const makeUser = (id: string) => Object.assign(new User(), { id });

/** Collects what a capability registers, the way the MCP server would receive it. */
const collectingRegister = () => {
	const tools: ToolDefinition<z.ZodRawShape, ToolHandlerResult>[] = [];
	const register: RegisterToolFn = (tool) => {
		tools.push(tool);
	};
	return { register, tools };
};

const callHandler = async (
	tool: ToolDefinition<z.ZodRawShape, ToolHandlerResult>,
	args: Record<string, unknown>,
) => (await tool.handler(args)) as CallToolResult;

const textOf = (result: CallToolResult) => {
	const [first] = result.content;
	return first?.type === 'text' ? first.text : undefined;
};

const whoAmIShape = {} satisfies z.ZodRawShape;

const whoAmI = (surfaces?: readonly CapabilitySurface[]) =>
	defineCapability({
		name: 'who_am_i',
		scope: 'workflow:read',
		surfaces,
		build: ({ user }: CapabilityContext): CapabilityToolDefinition<typeof whoAmIShape> => ({
			name: 'who_am_i',
			config: { description: 'Returns the acting user', inputSchema: whoAmIShape },
			handler: () => ({ content: [{ type: 'text', text: user.id }] }),
		}),
	});

describe('defineCapability', () => {
	it('builds the tool for each request with the acting user', async () => {
		const capability = whoAmI();
		const { register, tools } = collectingRegister();

		capability.registerOn(register, { user: makeUser('alice') });
		capability.registerOn(register, { user: makeUser('bob') });

		expect(tools).toHaveLength(2);
		expect(textOf(await callHandler(tools[0], {}))).toBe('alice');
		expect(textOf(await callHandler(tools[1], {}))).toBe('bob');
	});

	it('does not build the tool until a surface registers it', () => {
		const build = vi.fn(() => ({
			name: 'lazy_tool',
			config: { inputSchema: {} },
			handler: () => ({ content: [] }),
		}));
		const capability = defineCapability({ name: 'lazy_tool', scope: 'workflow:read', build });

		expect(build).not.toHaveBeenCalled();

		const user = makeUser('carol');
		capability.registerOn(collectingRegister().register, { user });

		expect(build).toHaveBeenCalledTimes(1);
		expect(build).toHaveBeenCalledWith({ user, surface: 'mcp' });
	});

	it('offers the capability on every surface by default', () => {
		const capability = whoAmI();

		expect(capability.surfaces).toEqual(['mcp', 'assistant']);
		expect(DEFAULT_CAPABILITY_SURFACES).toEqual(['mcp', 'assistant']);
	});

	it('keeps the given surfaces and drops repeated ones', () => {
		expect(whoAmI(['assistant']).surfaces).toEqual(['assistant']);
		expect(whoAmI(['mcp', 'mcp']).surfaces).toEqual(['mcp']);
	});

	it('exposes the name and scope without building the tool', () => {
		const capability = whoAmI();

		expect(capability.name).toBe('who_am_i');
		expect(capability.scope).toBe('workflow:read');
	});

	it('registers the tool under the capability name, also when the built name differs', () => {
		const capability = defineCapability({
			name: 'renamed_tool',
			scope: 'tag:read',
			build: () => ({
				name: 'other_name',
				config: { inputSchema: {} },
				handler: () => ({ content: [] }),
			}),
		});
		const { register, tools } = collectingRegister();

		capability.registerOn(register, { user: makeUser('dave') });

		expect(tools.map((tool) => tool.name)).toEqual(['renamed_tool']);
	});

	it.each(['', 'ParseSchedule', 'parse-schedule', '1st_tool', 'has space', 'a'.repeat(65)])(
		'rejects the invalid name %j',
		(name) => {
			expect(() =>
				defineCapability({
					name,
					scope: 'workflow:read',
					build: () => ({ name, config: { inputSchema: {} }, handler: () => ({ content: [] }) }),
				}),
			).toThrow(UnexpectedError);
		},
	);

	it('accepts a snake_case name of 64 characters', () => {
		const name = `a${'b'.repeat(63)}`;

		expect(
			defineCapability({
				name,
				scope: 'workflow:read',
				build: () => ({ name, config: { inputSchema: {} }, handler: () => ({ content: [] }) }),
			}).name,
		).toBe(name);
	});

	it('rejects a capability without surfaces', () => {
		expect(() => whoAmI([])).toThrow(UnexpectedError);
	});

	it('keeps the input type of a concrete shape without casts', async () => {
		const shape = {
			count: z.number().int(),
			label: z.string().optional(),
		} satisfies z.ZodRawShape;

		const capability = defineCapability({
			name: 'count_things',
			scope: 'workflow:read',
			build: (): CapabilityToolDefinition<typeof shape> => ({
				name: 'count_things',
				config: { inputSchema: shape },
				// `count` is a number and `label` is optional here. A wrong type fails `tsc`.
				handler: ({ count, label }) => {
					expectTypeOf(count).toEqualTypeOf<number>();
					expectTypeOf(label).toEqualTypeOf<string | undefined>();
					return { content: [{ type: 'text', text: `${label ?? 'items'}: ${count.toFixed(0)}` }] };
				},
			}),
		});
		const { register, tools } = collectingRegister();

		capability.registerOn(register, { user: makeUser('erin') });

		expect(tools[0].config.inputSchema).toBe(shape);
		expect(textOf(await callHandler(tools[0], { count: 3 }))).toBe('items: 3');
	});
});

describe('defineCapability on the Assistant surface', () => {
	const surfaceProbe = (options: { alwaysLoaded?: boolean } = {}) => {
		const build = vi.fn(
			({ user, surface }: CapabilityContext): CapabilityToolDefinition<typeof whoAmIShape> => ({
				name: 'surface_probe',
				config: { inputSchema: whoAmIShape },
				handler: () => ({ content: [{ type: 'text', text: `${user.id}@${surface}` }] }),
			}),
		);
		const capability = defineCapability({
			name: 'surface_probe',
			scope: 'workflow:read',
			assistant: options,
			build,
		});
		return { build, capability };
	};

	it('tells the tool which surface runs it', async () => {
		const { build, capability } = surfaceProbe();
		const user = makeUser('frank');
		const { register, tools } = collectingRegister();

		capability.registerOn(register, { user });
		const { tool } = capability.toAssistantTool({ user });

		expect(build.mock.calls.map(([context]) => context.surface)).toEqual(['mcp', 'assistant']);
		expect(textOf(await callHandler(tools[0], {}))).toBe('frank@mcp');
		expect(await tool.handler?.({}, {})).toBe('frank@assistant');
	});

	it('defers the Assistant tool unless the capability asks to stay loaded', () => {
		const user = makeUser('gina');

		expect(surfaceProbe().capability.toAssistantTool({ user }).alwaysLoaded).toBe(false);
		expect(
			surfaceProbe({ alwaysLoaded: true }).capability.toAssistantTool({ user }).alwaysLoaded,
		).toBe(true);
	});

	it('does not build an Assistant tool for a capability that only MCP clients get', () => {
		const capability = whoAmI(['mcp']);

		expect(() => capability.toAssistantTool({ user: makeUser('hal') })).toThrow(UnexpectedError);
	});

	it('uses the capability name and falls back to it as the description', () => {
		const { tool } = surfaceProbe().capability.toAssistantTool({ user: makeUser('ida') });

		expect(tool.name).toBe('surface_probe');
		expect(tool.description).toBe('surface_probe');
		expect(tool.mcpAnnotations).toBeUndefined();
	});
});
