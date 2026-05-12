import type { AuthenticatedRequest, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import type { ExecuteNodeRequestDto } from '@/executions/dto/execute-node-request.dto';
import type { ExecuteNodeService } from '@/executions/execute-node.service';
import { ExecutionsController } from '@/executions/executions.controller';

describe('ExecutionsController.executeNode', () => {
	const executeNodeService = mock<ExecuteNodeService>();
	const user = mock<User>({ id: 'user-1' });

	const controller = new ExecutionsController(mock(), mock(), mock(), mock(), executeNodeService);

	const makeReq = (
		overrides: Partial<{ protocol: string; host: string }> = {},
	): AuthenticatedRequest => {
		const protocol = overrides.protocol ?? 'http';
		const host = overrides.host ?? 'localhost:5678';
		return {
			user,
			protocol,
			get: (header: string) => (header.toLowerCase() === 'host' ? host : undefined),
		} as unknown as AuthenticatedRequest;
	};

	const res = mock<Response>();

	const body: ExecuteNodeRequestDto = {
		nodeType: 'n8n-nodes-base.set',
		parameters: { values: { string: [{ name: 'k', value: 'v' }] } },
	} as ExecuteNodeRequestDto;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('delegates to ExecuteNodeService with the authenticated user and request body', async () => {
		executeNodeService.execute.mockResolvedValue({
			executionId: 'exec-42',
			status: 'success',
			output: [{ k: 'v' }],
		});

		await controller.executeNode(makeReq(), res, body);

		expect(executeNodeService.execute).toHaveBeenCalledTimes(1);
		const calledWith = executeNodeService.execute.mock.calls[0][0];
		expect(calledWith.user.id).toBe('user-1');
		expect(calledWith.nodeType).toBe('n8n-nodes-base.set');
		expect(calledWith.parameters).toEqual(body.parameters);
	});

	it('returns the service result plus an executionUrl built from the request host', async () => {
		executeNodeService.execute.mockResolvedValue({
			executionId: 'exec-42',
			status: 'success',
			output: [{ k: 'v' }],
		});

		const result = await controller.executeNode(
			makeReq({ protocol: 'https', host: 'n8n.example.com' }),
			res,
			body,
		);

		expect(result).toEqual({
			executionId: 'exec-42',
			status: 'success',
			output: [{ k: 'v' }],
			executionUrl: 'https://n8n.example.com/executions/exec-42',
		});
	});

	it('omits executionUrl for dry-run results (no executionId)', async () => {
		executeNodeService.execute.mockResolvedValue({
			executionId: '',
			status: 'dry_run',
			wouldExecute: { node: mock() },
		});

		const result = await controller.executeNode(makeReq(), res, {
			...body,
			dryRun: true,
		} as ExecuteNodeRequestDto);

		expect(result.executionId).toBe('');
		expect(result.status).toBe('dry_run');
		expect('executionUrl' in result).toBe(false);
	});

	it('forwards optional fields (credentialId, dryRun, caller, nodeVersion) to the service', async () => {
		executeNodeService.execute.mockResolvedValue({
			executionId: 'exec-1',
			status: 'success',
		});

		const richBody: ExecuteNodeRequestDto = {
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeVersion: 4,
			parameters: { url: 'https://example.com' },
			credentialId: 'cred-1',
			dryRun: false,
			caller: { kind: 'mcp', name: 'claude-code', clientId: 'cli-1' },
		} as ExecuteNodeRequestDto;

		await controller.executeNode(makeReq(), res, richBody);

		const calledWith = executeNodeService.execute.mock.calls[0][0];
		expect(calledWith.nodeVersion).toBe(4);
		expect(calledWith.credentialId).toBe('cred-1');
		expect(calledWith.dryRun).toBe(false);
		expect(calledWith.caller).toEqual({
			kind: 'mcp',
			name: 'claude-code',
			clientId: 'cli-1',
		});
	});

	it('propagates errors from ExecuteNodeService', async () => {
		executeNodeService.execute.mockRejectedValue(new Error('boom'));

		await expect(controller.executeNode(makeReq(), res, body)).rejects.toThrow('boom');
	});
});

describe('ExecuteNodeRequestDto (Zod schema)', () => {
	it('accepts a minimal body and applies defaults', async () => {
		const { ExecuteNodeRequestDto } = await import('@/executions/dto/execute-node-request.dto');
		const result = ExecuteNodeRequestDto.safeParse({
			nodeType: 'n8n-nodes-base.set',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.parameters).toEqual({});
		}
	});

	it('rejects an empty nodeType', async () => {
		const { ExecuteNodeRequestDto } = await import('@/executions/dto/execute-node-request.dto');
		const result = ExecuteNodeRequestDto.safeParse({ nodeType: '' });
		expect(result.success).toBe(false);
	});

	it('rejects an unknown caller kind', async () => {
		const { ExecuteNodeRequestDto } = await import('@/executions/dto/execute-node-request.dto');
		const result = ExecuteNodeRequestDto.safeParse({
			nodeType: 'n8n-nodes-base.set',
			caller: { kind: 'not-a-real-kind', name: 'x' },
		});
		expect(result.success).toBe(false);
	});

	it('rejects a non-numeric nodeVersion', async () => {
		const { ExecuteNodeRequestDto } = await import('@/executions/dto/execute-node-request.dto');
		const result = ExecuteNodeRequestDto.safeParse({
			nodeType: 'n8n-nodes-base.set',
			nodeVersion: 'two',
		});
		expect(result.success).toBe(false);
	});
});
