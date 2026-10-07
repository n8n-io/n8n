vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	createInstanceAgent: vi.fn(),
}));

import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createInstanceAgent, type CreateInstanceAgentOptions } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';
import z from 'zod';

import { type CapabilitySurface, defineCapability } from '@/services/capabilities/capability';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';

import { InstanceAiService } from '../instance-ai.service';

type Internals = {
	createAgentFromEnvironment(
		environment: unknown,
		threadId: string,
		runId: string,
		user: User,
		tracing: undefined,
	): Promise<unknown>;
};

const shape = { text: z.string() } satisfies z.ZodRawShape;

const capability = (name: string, surfaces: CapabilitySurface[], alwaysLoaded = false) =>
	defineCapability({
		name,
		scope: 'workflow:read',
		surfaces,
		assistant: { alwaysLoaded },
		build: ({ user, surface }) => ({
			name,
			config: { inputSchema: shape },
			handler: () => ({ content: [{ type: 'text', text: `${user.id}@${surface}` }] }),
		}),
	});

// The registry rejects an MCP capability that its list does not name, so list the test ones.
const testRegistry = () =>
	new CapabilityRegistry({
		'workflow:read': ['parse_schedule', 'mcp_only_tool'],
		'workflow:execute': ['guarded_tool'],
	});

function createService(eventService: EventService): Internals {
	const service = Object.create(InstanceAiService.prototype) as Record<string, unknown>;
	Object.assign(service, {
		eventService,
		instanceAiConfig: { thinkingEnabled: true },
		_mcpClientManager: { disconnect: vi.fn() },
		bindAgentContextReader: vi.fn(async () => {}),
		bindAgentPreviewSession: vi.fn(async () => {}),
		buildMcpServers: vi.fn(async () => []),
		createAgentMemoryOptions: vi.fn(() => ({})),
		memoryTaskObserverFor: vi.fn(() => vi.fn()),
		subscribeToAgentErrors: vi.fn(),
	});
	Object.defineProperty(service, 'assistantCheckpointStore', { value: 'checkpoint-store' });
	return service as unknown as Internals;
}

describe('InstanceAiService capability tools', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const environment = {
		modelId: 'test-model',
		context: {},
		orchestrationContext: {},
		memory: undefined,
		observerThresholdTokens: undefined,
	};

	beforeEach(() => {
		vi.mocked(createInstanceAgent)
			.mockReset()
			.mockResolvedValue({ agent: {}, mcpConnectionFailures: [] } as never);
		Container.set(CapabilityRegistry, testRegistry());
	});

	afterAll(() => {
		Container.set(CapabilityRegistry, new CapabilityRegistry());
	});

	const passedOptions = (): CreateInstanceAgentOptions =>
		vi.mocked(createInstanceAgent).mock.calls[0][0];

	it('passes the Assistant capabilities, built for the acting user, to the agent', async () => {
		const registry = Container.get(CapabilityRegistry);
		registry.register(capability('parse_schedule', ['mcp', 'assistant']));
		registry.register(capability('mcp_only_tool', ['mcp']));
		registry.register(capability('assistant_pinned', ['assistant'], true));
		const eventService = mock<EventService>();

		await createService(eventService).createAgentFromEnvironment(
			environment,
			'thread-1',
			'run-1',
			user,
			undefined,
		);

		const capabilityTools = passedOptions().capabilityTools ?? [];
		expect(capabilityTools.map(({ tool, alwaysLoaded }) => [tool.name, alwaysLoaded])).toEqual([
			['parse_schedule', false],
			['assistant_pinned', true],
		]);
		await expect(capabilityTools[0].tool.handler?.({ text: 'hi' }, {})).resolves.toBe(
			'user-1@assistant',
		);
		expect(eventService.emit).toHaveBeenCalledWith(
			'mcp-tool-called',
			expect.objectContaining({ user, toolName: 'parse_schedule', clientName: 'n8n-assistant' }),
		);
	});

	it('applies the admin permission modes of the run to the capability tools', async () => {
		const handler = vi.fn(() => ({ content: [{ type: 'text' as const, text: 'ran' }] }));
		Container.get(CapabilityRegistry).register(
			defineCapability({
				name: 'guarded_tool',
				scope: 'workflow:execute',
				assistant: { permission: () => 'runWorkflow' },
				build: () => ({ name: 'guarded_tool', config: { inputSchema: shape }, handler }),
			}),
		);
		const permissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS, runWorkflow: 'blocked' as const };

		await createService(mock<EventService>()).createAgentFromEnvironment(
			{ ...environment, context: { permissions } },
			'thread-1',
			'run-1',
			user,
			undefined,
		);

		const [{ tool }] = passedOptions().capabilityTools ?? [];
		const output = await tool.handler?.(
			{ text: 'hi' },
			{ suspend: vi.fn(), resumeData: undefined },
		);
		expect(output).toMatchObject({ denied: true });
		expect(handler).not.toHaveBeenCalled();
	});

	it('passes no capability tools when none are registered for the Assistant', async () => {
		Container.get(CapabilityRegistry).register(capability('mcp_only_tool', ['mcp']));

		await createService(mock<EventService>()).createAgentFromEnvironment(
			environment,
			'thread-1',
			'run-1',
			user,
			undefined,
		);

		expect(passedOptions().capabilityTools).toEqual([]);
	});
});
