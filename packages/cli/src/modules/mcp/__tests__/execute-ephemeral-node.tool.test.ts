import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { EphemeralNodeExecutor } from '@/node-execution';
import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';

import { createExecuteEphemeralNodeTool } from '../tools/execute-ephemeral-node.tool';

describe('execute-ephemeral-node MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const buildBaseInput = () => ({
		projectId: 'proj-1',
		nodeType: 'n8n-nodes-base.httpRequest',
		nodeTypeVersion: 4.2,
		nodeParameters: { method: 'GET', url: 'https://example.com' },
		credentials: undefined as never,
		inputData: undefined as never,
	});

	const createMocks = (overrides?: {
		executeInline?: jest.Mock;
		getProjectWithScope?: jest.Mock;
	}) => {
		const ephemeralNodeExecutor = mockInstance(EphemeralNodeExecutor, {
			executeInline:
				overrides?.executeInline ??
				jest.fn().mockResolvedValue({ status: 'success', data: [{ json: { ok: true } }] }),
		});
		const projectService = mockInstance(ProjectService, {
			getProjectWithScope:
				overrides?.getProjectWithScope ?? jest.fn().mockResolvedValue({ id: 'proj-1' }),
		});
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		return { ephemeralNodeExecutor, projectService, telemetry };
	};

	describe('smoke tests', () => {
		test('creates the tool correctly', () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks();

			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			expect(tool.name).toBe('execute_ephemeral_node');
			expect(tool.config.description).toEqual(expect.any(String));
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations).toMatchObject({
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: true,
			});
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler', () => {
		test('returns the executor result on success', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks();
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			const result = await tool.handler(buildBaseInput(), {} as never);

			expect(result.structuredContent).toEqual({
				status: 'success',
				data: [{ json: { ok: true } }],
			});
			expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: 'proj-1',
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeTypeVersion: 4.2,
					nodeParameters: { method: 'GET', url: 'https://example.com' },
					// Defaults to one empty input item — see the comment in the tool
					// about why [] is a silent footgun.
					inputData: [{ json: {} }],
				}),
			);
		});

		test('defaults inputData to a single empty item when an empty array is passed', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks();
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			await tool.handler({ ...buildBaseInput(), inputData: [] as never }, {} as never);

			expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
				expect.objectContaining({ inputData: [{ json: {} }] }),
			);
		});

		test('passes through executor validation errors with status:error', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks({
				executeInline: jest.fn().mockResolvedValue({
					status: 'error',
					data: [],
					error:
						'Cannot execute node "n8n-nodes-base.scheduleTrigger": Trigger nodes cannot be executed standalone',
				}),
			});
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			const result = await tool.handler(buildBaseInput(), {} as never);

			expect(result.structuredContent).toEqual({
				status: 'error',
				data: [],
				error: expect.stringContaining('Trigger nodes cannot be executed standalone'),
			});
			// Tool result itself is not marked as isError — executor errors are part of the contract
			expect((result as { isError?: boolean }).isError).toBeUndefined();
		});

		test('rejects calls when project access check fails', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks({
				getProjectWithScope: jest.fn().mockResolvedValue(null),
			});
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			const result = await tool.handler(buildBaseInput(), {} as never);

			expect(result.structuredContent).toMatchObject({
				status: 'error',
				data: [],
				error: expect.stringContaining('ephemeralNode:execute'),
			});
			expect(ephemeralNodeExecutor.executeInline).not.toHaveBeenCalled();
			expect(projectService.getProjectWithScope).toHaveBeenCalledWith(user, 'proj-1', [
				'ephemeralNode:execute',
			]);
		});

		test('passes credentials and inputData through to the executor', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks();
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			await tool.handler(
				{
					...buildBaseInput(),
					credentials: {
						httpHeaderAuth: { id: 'cred-1', name: 'My Auth' },
					} as never,
					inputData: [{ json: { foo: 'bar' } }] as never,
				},
				{} as never,
			);

			expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
				expect.objectContaining({
					credentialDetails: { httpHeaderAuth: { id: 'cred-1', name: 'My Auth' } },
					inputData: [{ json: { foo: 'bar' } }],
				}),
			);
		});

		test('tracks telemetry on success without leaking node parameters', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks();
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			await tool.handler(
				{
					...buildBaseInput(),
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Auth' } } as never,
					inputData: [{ json: { secret: 'shhh' } }] as never,
				},
				{} as never,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'execute_ephemeral_node',
					parameters: {
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeTypeVersion: 4.2,
						projectId: 'proj-1',
						hasCredentials: true,
						hasInput: true,
					},
					results: { success: true, data: { status: 'success' } },
				}),
			);
			// Parameters payload must not contain nodeParameters or inputData values
			const trackedParams = (telemetry.track as jest.Mock).mock.calls[0][1].parameters;
			expect(trackedParams).not.toHaveProperty('nodeParameters');
			expect(trackedParams).not.toHaveProperty('inputData');
			expect(trackedParams).not.toHaveProperty('credentials');
		});

		test('tracks telemetry on executor error', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks({
				executeInline: jest
					.fn()
					.mockResolvedValue({ status: 'error', data: [], error: 'Node is not usable as a tool' }),
			});
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			await tool.handler(buildBaseInput(), {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					results: expect.objectContaining({
						success: false,
						error: 'Node is not usable as a tool',
					}),
				}),
			);
		});

		test('catches thrown executor errors and returns status:error', async () => {
			const { ephemeralNodeExecutor, projectService, telemetry } = createMocks({
				executeInline: jest.fn().mockRejectedValue(new Error('boom')),
			});
			const tool = createExecuteEphemeralNodeTool(
				user,
				ephemeralNodeExecutor,
				projectService,
				telemetry,
			);

			const result = await tool.handler(buildBaseInput(), {} as never);

			expect(result.structuredContent).toMatchObject({
				status: 'error',
				data: [],
				error: 'boom',
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					results: expect.objectContaining({ success: false }),
				}),
			);
		});
	});
});
