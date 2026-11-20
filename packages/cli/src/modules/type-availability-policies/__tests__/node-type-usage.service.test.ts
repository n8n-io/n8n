import type { OperationContext, Transaction, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';
import { stripToolSuffix } from '@/utils';

import type { TypeUsageRepository } from '../database/repositories/type-usage.repository';
import { NodeTypeUsageService } from '../node-type-usage.service';

const GMAIL = 'n8n-nodes-base.gmail';
const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';
const GMAIL_HITL_TOOL = 'n8n-nodes-base.gmailHitlTool';
const SLACK = 'n8n-nodes-base.slack';
const SLACK_TOOL = 'n8n-nodes-base.slackTool';
/** A real node whose name ends in `Tool`. It is not a variant of anything. */
const REAL_TOOL = '@n8n/n8n-nodes-langchain.mcpClientTool';

const usage = (uses: number, workflows = uses) => ({
	uses,
	workflows,
	activeWorkflows: 0,
	projects: 1,
});

describe('NodeTypeUsageService', () => {
	const repository = mock<TypeUsageRepository>();
	const nodeTypes = mock<NodeTypes>();
	const transactionRunner = mock<TransactionRunner>();
	const service = new NodeTypeUsageService(
		repository,
		nodeTypes,
		mock<LoadNodesAndCredentials>(),
		transactionRunner,
	);
	const ctx: OperationContext = { trx: mock<Transaction>() };

	beforeEach(() => {
		vi.resetAllMocks();
		nodeTypes.resolveBaseName.mockImplementation((name) =>
			name.endsWith('Tool') && name !== REAL_TOOL
				? { baseName: stripToolSuffix(name), isSyntheticTool: true }
				: { baseName: name, isSyntheticTool: false },
		);
		transactionRunner.run.mockImplementation(async (_context, fn) => await fn(ctx));
		repository.countNodeTypeUsageByGroup.mockResolvedValue({});
	});

	it('returns the literal counts and groups nothing when no tool variant is in use', async () => {
		const literal = { [GMAIL]: usage(2), [REAL_TOOL]: usage(1) };
		repository.countNodeTypeUsage.mockResolvedValue(literal);

		await expect(service.getUsage(null)).resolves.toEqual(literal);

		expect(repository.countNodeTypeUsage).toHaveBeenCalledWith(null, ctx);
		expect(repository.countNodeTypeUsageByGroup).toHaveBeenCalledWith(null, new Map(), ctx);
	});

	it('reads in one read-only transaction', async () => {
		repository.countNodeTypeUsage.mockResolvedValue({});

		await service.getUsage(null);

		expect(transactionRunner.run).toHaveBeenCalledWith({}, expect.any(Function), {
			readOnly: true,
		});
	});

	it('replaces the entry of a base type with the count of its group, and keeps the variant entries', async () => {
		repository.countNodeTypeUsage.mockResolvedValue({
			[GMAIL]: usage(2),
			[GMAIL_TOOL]: usage(1),
			[GMAIL_HITL_TOOL]: usage(1),
			[SLACK]: usage(1),
		});
		repository.countNodeTypeUsageByGroup.mockResolvedValue({ [GMAIL]: usage(4, 2) });

		const result = await service.getUsage('project-id');

		expect(repository.countNodeTypeUsageByGroup).toHaveBeenCalledWith(
			'project-id',
			new Map([[GMAIL, [GMAIL, GMAIL_TOOL, GMAIL_HITL_TOOL]]]),
			ctx,
		);
		expect(result).toEqual({
			[GMAIL]: usage(4, 2),
			[GMAIL_TOOL]: usage(1),
			[GMAIL_HITL_TOOL]: usage(1),
			[SLACK]: usage(1),
		});
	});

	it('adds an entry for a base type when only its variant is in use', async () => {
		repository.countNodeTypeUsage.mockResolvedValue({ [SLACK_TOOL]: usage(1) });
		repository.countNodeTypeUsageByGroup.mockResolvedValue({ [SLACK]: usage(1) });

		const result = await service.getUsage(null);

		expect(repository.countNodeTypeUsageByGroup).toHaveBeenCalledWith(
			null,
			new Map([[SLACK, [SLACK, SLACK_TOOL]]]),
			ctx,
		);
		expect(result).toEqual({ [SLACK]: usage(1), [SLACK_TOOL]: usage(1) });
	});

	it('groups a variant whose base name is an Object.prototype key', async () => {
		repository.countNodeTypeUsage.mockResolvedValue({
			toStringTool: usage(1),
			constructorTool: usage(1),
		});

		await service.getUsage(null);

		expect(repository.countNodeTypeUsageByGroup).toHaveBeenCalledWith(
			null,
			new Map([
				['toString', ['toString', 'toStringTool']],
				['constructor', ['constructor', 'constructorTool']],
			]),
			ctx,
		);
	});
});
