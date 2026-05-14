import type { BuiltTool } from '@n8n/agents';
import type { AgentsConfig } from '@n8n/config';
import type { McpTool } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { ComputerUseGatewayService } from '@/modules/computer-use-gateway/computer-use-gateway.service';
import type { LocalGateway } from '@/modules/computer-use-gateway/local-gateway';
import type { UrlService } from '@/services/url.service';

import type { AgentJsonConfig } from '../../json-config/agent-json-config';
import { AgentsComputerUseService } from '../agents-computer-use.service';

const userId = 'user-1';

function makeTool(name: string, category: string): McpTool {
	return {
		name,
		description: `${name} description`,
		inputSchema: { type: 'object', properties: {} },
		annotations: { category },
	};
}

function makeConfig(overrides: Partial<AgentJsonConfig['computerUse']> = {}): AgentJsonConfig {
	return {
		name: 'Test',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help',
		computerUse: {
			enabled: true,
			filesystem: { enabled: true, write: false },
			shell: { enabled: false },
			...overrides,
		},
	};
}

function makeGateway(tools: McpTool[]): jest.Mocked<LocalGateway> {
	return mock<LocalGateway>({
		isConnected: true,
		rootPath: '/workspace',
		getStatus: () => ({
			connected: true,
			connectedAt: '2026-05-14T00:00:00.000Z',
			directory: '/workspace',
			hostIdentifier: 'user@host',
			toolCategories: [
				{ name: 'filesystem', enabled: true, writeAccess: true },
				{ name: 'shell', enabled: true },
			],
			tools,
		}),
		callTool: jest.fn(),
		previewTool: jest.fn(),
	} as Partial<LocalGateway>);
}

function setup(options: { modules?: string[]; tools?: McpTool[] } = {}) {
	const tools = options.tools ?? [
		makeTool('read_file', 'filesystem'),
		makeTool('write_file', 'filesystem'),
		makeTool('shell_execute', 'shell'),
	];
	const gateway = makeGateway(tools);
	const gatewayService = mock<ComputerUseGatewayService>({
		findGateway: () => gateway,
		getGatewayStatus: () => gateway.getStatus(),
		generatePairingToken: () => 'gw-token',
		getGatewayApiKeyExpiresAt: () => new Date('2026-05-14T12:00:00.000Z'),
	});
	const urlService = mock<UrlService>({
		getInstanceBaseUrl: () => 'http://localhost:5678',
	});
	const service = new AgentsComputerUseService(
		{ modules: options.modules ?? ['computer-use'] } as unknown as AgentsConfig,
		gatewayService,
		urlService,
	);

	return { service, gateway };
}

function getTool(tools: BuiltTool[], name: string): BuiltTool {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool) throw new Error(`Missing tool: ${name}`);
	return tool;
}

type ToolHandlerContext = Parameters<NonNullable<BuiltTool['handler']>>[1];

function makeSuspend() {
	return jest.fn(async (payload: unknown): Promise<never> => payload as never);
}

function makeSuspendContext(suspend = makeSuspend()): ToolHandlerContext {
	return { suspend } as ToolHandlerContext;
}

function makeResumeContext(approved: boolean): ToolHandlerContext {
	return { resumeData: { approved }, suspend: makeSuspend() } as ToolHandlerContext;
}

describe('AgentsComputerUseService', () => {
	it('exposes only tools allowed by agent config and daemon capabilities', () => {
		const { service } = setup();

		const tools = service.getRuntimeTools(makeConfig(), userId);

		expect(tools.map((tool) => tool.name)).toEqual(['read_file']);
	});

	it('executes read tools and normalizes structured output', async () => {
		const { service, gateway } = setup();
		gateway.callTool.mockResolvedValue({
			content: [{ type: 'text', text: '{"ignored":true}' }],
			structuredContent: { content: 'hello' },
		});
		const readFile = getTool(service.getRuntimeTools(makeConfig(), userId), 'read_file');

		await expect(readFile.handler?.({ filePath: 'a.txt' }, {})).resolves.toEqual({
			content: 'hello',
		});
		expect(gateway.callTool).toHaveBeenCalledWith({
			name: 'read_file',
			arguments: { filePath: 'a.txt' },
		});
	});

	it('suspends file mutations before execution', async () => {
		const { service, gateway } = setup();
		gateway.previewTool.mockResolvedValue({
			content: [],
			structuredContent: {
				resources: [
					{
						toolGroup: 'filesystemWrite',
						resource: '/workspace/a.txt',
						description: 'Write file: a.txt',
						preview: { kind: 'text', content: 'hello' },
					},
				],
			},
		});
		const writeFile = getTool(
			service.getRuntimeTools(makeConfig({ filesystem: { enabled: true, write: true } }), userId),
			'write_file',
		);
		const suspend = makeSuspend();

		await expect(
			writeFile.handler?.({ filePath: 'a.txt', content: 'hello' }, makeSuspendContext(suspend)),
		).resolves.toMatchObject({
			type: 'approval',
			toolName: 'write_file',
			resources: [
				{
					toolGroup: 'filesystemWrite',
					resource: '/workspace/a.txt',
					preview: { kind: 'text', content: 'hello' },
				},
			],
		});
		expect(gateway.previewTool).toHaveBeenCalledWith({
			name: 'write_file',
			arguments: { filePath: 'a.txt', content: 'hello' },
		});
		expect(gateway.callTool).not.toHaveBeenCalled();
	});

	it('does not execute denied file mutations', async () => {
		const { service, gateway } = setup();
		const writeFile = getTool(
			service.getRuntimeTools(makeConfig({ filesystem: { enabled: true, write: true } }), userId),
			'write_file',
		);

		await expect(
			writeFile.handler?.({ filePath: 'a.txt', content: 'hello' }, makeResumeContext(false)),
		).resolves.toEqual({
			approved: false,
			message: 'Computer Use action "write_file" was not approved',
		});
		expect(gateway.callTool).not.toHaveBeenCalled();
	});

	it('suspends process kills before execution', async () => {
		const { service, gateway } = setup({ tools: [makeTool('process_kill', 'shell')] });
		gateway.previewTool.mockResolvedValue({
			content: [],
			structuredContent: {
				resources: [
					{
						toolGroup: 'shell',
						resource: 'process:proc_123',
						description: 'Stop process: proc_123',
					},
				],
			},
		});
		const processKill = getTool(
			service.getRuntimeTools(makeConfig({ shell: { enabled: true } }), userId),
			'process_kill',
		);
		const suspend = makeSuspend();

		await expect(
			processKill.handler?.({ processId: 'proc_123' }, makeSuspendContext(suspend)),
		).resolves.toMatchObject({
			type: 'approval',
			toolName: 'process_kill',
			resources: [{ toolGroup: 'shell', resource: 'process:proc_123' }],
		});
		expect(gateway.previewTool).toHaveBeenCalledWith({
			name: 'process_kill',
			arguments: { processId: 'proc_123' },
		});
		expect(gateway.callTool).not.toHaveBeenCalled();
	});

	it('executes approved mutations with one-shot daemon confirmation', async () => {
		const { service, gateway } = setup();
		gateway.callTool.mockResolvedValue({
			content: [{ type: 'text', text: '{"path":"a.txt"}' }],
		});
		const writeFile = getTool(
			service.getRuntimeTools(makeConfig({ filesystem: { enabled: true, write: true } }), userId),
			'write_file',
		);

		await expect(
			writeFile.handler?.(
				{ filePath: 'a.txt', content: 'hello', _confirmation: 'denyOnce' },
				makeResumeContext(true),
			),
		).resolves.toEqual({ path: 'a.txt' });
		expect(gateway.callTool).toHaveBeenCalledWith({
			name: 'write_file',
			arguments: { filePath: 'a.txt', content: 'hello', _confirmation: 'allowOnce' },
		});
	});
});
