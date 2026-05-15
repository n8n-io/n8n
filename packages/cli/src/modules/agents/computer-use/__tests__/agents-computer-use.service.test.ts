import type { BuiltTool } from '@n8n/agents';
import type { AgentsConfig } from '@n8n/config';
import type { McpTool, ToolCategory } from '@n8n/api-types';
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

function makeGateway(tools: McpTool[], toolCategories?: ToolCategory[]): jest.Mocked<LocalGateway> {
	return mock<LocalGateway>({
		isConnected: true,
		rootPath: '/workspace',
		getStatus: () => ({
			connected: true,
			connectedAt: '2026-05-14T00:00:00.000Z',
			directory: '/workspace',
			hostIdentifier: 'user@host',
			toolCategories: toolCategories ?? [
				{ name: 'filesystem', enabled: true, writeAccess: true },
				{ name: 'shell', enabled: true },
			],
			tools,
		}),
		callTool: jest.fn(),
		previewTool: jest.fn(),
	} as Partial<LocalGateway>);
}

function setup(
	options: { modules?: string[]; tools?: McpTool[]; toolCategories?: ToolCategory[] } = {},
) {
	const tools = options.tools ?? [
		makeTool('read_file', 'filesystem'),
		makeTool('write_file', 'filesystem'),
		makeTool('shell_execute', 'shell'),
	];
	const gateway = makeGateway(tools, options.toolCategories);
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

	it('reports browser status only as ready when daemon permission is allow', () => {
		const { service } = setup({
			tools: [makeTool('browser_snapshot', 'browser')],
			toolCategories: [{ name: 'browser', enabled: true, permissionMode: 'ask' }],
		});

		expect(service.getStatus(userId).capabilities.browser).toEqual({
			enabled: true,
			permissionMode: 'ask',
			ready: false,
		});

		const { service: allowService } = setup({
			tools: [makeTool('browser_snapshot', 'browser')],
			toolCategories: [{ name: 'browser', enabled: true, permissionMode: 'allow' }],
		});

		expect(allowService.getStatus(userId).capabilities.browser).toEqual({
			enabled: true,
			permissionMode: 'allow',
			ready: true,
		});
	});

	it('exposes only semantic MVP browser tools when config and daemon permission allow it', () => {
		const { service } = setup({
			tools: [
				makeTool('browser_snapshot', 'browser'),
				makeTool('browser_click', 'browser'),
				makeTool('browser_evaluate', 'browser'),
			],
			toolCategories: [{ name: 'browser', enabled: true, permissionMode: 'allow' }],
		});

		const tools = service.getRuntimeTools(makeConfig({ browser: { enabled: true } }), userId);

		expect(tools.map((tool) => tool.name)).toEqual(['browser_snapshot', 'browser_click']);
		expect(getTool(tools, 'browser_click').suspendSchema).toBeDefined();
		expect(getTool(tools, 'browser_snapshot').suspendSchema).toBeUndefined();
	});

	it('normalizes top-level browser union schemas into object schemas for model tools', () => {
		const { service } = setup({
			tools: [
				{
					name: 'browser_scroll',
					description: 'Scroll the page',
					inputSchema: {
						oneOf: [
							{
								type: 'object',
								properties: { mode: { const: 'element' } },
								required: ['mode'],
							},
							{
								type: 'object',
								properties: { mode: { const: 'direction' } },
								required: ['mode'],
							},
						],
					},
					annotations: { category: 'browser' },
				},
			],
			toolCategories: [{ name: 'browser', enabled: true, permissionMode: 'allow' }],
		});

		const scroll = getTool(
			service.getRuntimeTools(makeConfig({ browser: { enabled: true } }), userId),
			'browser_scroll',
		);

		expect(scroll.inputSchema).toMatchObject({
			type: 'object',
			properties: {
				mode: { enum: ['element', 'direction'] },
			},
			required: ['mode'],
		});
		expect(scroll.inputSchema).not.toHaveProperty('oneOf');
		expect(scroll.inputSchema).not.toHaveProperty('anyOf');
	});

	it('does not expose browser tools when daemon browser permission is ask', () => {
		const { service } = setup({
			tools: [makeTool('browser_snapshot', 'browser')],
			toolCategories: [{ name: 'browser', enabled: true, permissionMode: 'ask' }],
		});

		const tools = service.getRuntimeTools(makeConfig({ browser: { enabled: true } }), userId);

		expect(tools).toEqual([]);
	});

	it('adds a browser action preview before suspending browser mutations', async () => {
		const { service, gateway } = setup({
			tools: [makeTool('browser_type', 'browser')],
			toolCategories: [{ name: 'browser', enabled: true, permissionMode: 'allow' }],
		});
		gateway.previewTool.mockResolvedValue({
			content: [],
			structuredContent: {
				resources: [
					{
						toolGroup: 'browser',
						resource: 'example.com',
						description: 'Browser: example.com',
					},
				],
			},
		});
		const browserType = getTool(
			service.getRuntimeTools(makeConfig({ browser: { enabled: true } }), userId),
			'browser_type',
		);

		await expect(
			browserType.handler?.(
				{ element: { ref: 'e1' }, text: 'secret-ish value' },
				makeSuspendContext(),
			),
		).resolves.toMatchObject({
			type: 'approval',
			toolName: 'browser_type',
			resources: [
				{
					toolGroup: 'browser',
					resource: 'example.com',
					preview: {
						kind: 'text',
						content: expect.stringContaining('secret-ish value') as string,
					},
				},
			],
		});
	});

	it('preserves browser screenshot image content for the model message', async () => {
		const { service, gateway } = setup({
			tools: [makeTool('browser_screenshot', 'browser')],
			toolCategories: [{ name: 'browser', enabled: true, permissionMode: 'allow' }],
		});
		gateway.callTool.mockResolvedValue({
			content: [
				{ type: 'image', data: 'base64-png', mimeType: 'image/png' },
				{ type: 'text', text: '{"hint":"visual"}' },
			],
		});
		const screenshot = getTool(
			service.getRuntimeTools(makeConfig({ browser: { enabled: true } }), userId),
			'browser_screenshot',
		);

		const output = await screenshot.handler?.({}, {});

		expect(output).toEqual({
			content: [
				{ type: 'image', data: 'base64-png', mimeType: 'image/png' },
				{ type: 'text', text: '{"hint":"visual"}' },
			],
		});
		expect(screenshot.toModelOutput?.(output)).toEqual({
			content: '{"hint":"visual"}',
			images: [{ mimeType: 'image/png' }],
		});
		expect(screenshot.toMessage?.(output)).toEqual({
			role: 'assistant',
			content: [
				{ type: 'file', data: 'base64-png', mediaType: 'image/png' },
				{ type: 'text', text: '{"hint":"visual"}' },
			],
		});
	});
});
