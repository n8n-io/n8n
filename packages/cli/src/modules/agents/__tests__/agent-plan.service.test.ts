import type { OperationContext, Transaction } from '@n8n/db';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { AgentPlanService } from '../agent-plan.service';
import { AgentPlanValidationError, type AgentPlanDocument } from '../plans/agent-plan.schema';
import {
	AgentPlanRepository,
	AgentPlanWriteConflictError,
	type AgentPlanRecord,
} from '../repositories/agent-plan.repository';

const repository = mock<AgentPlanRepository>();
const ctx: OperationContext = { trx: mock<Transaction>() };
const service = new AgentPlanService(repository);
const data: AgentPlanDocument = {
	title: 'Plan',
	description: 'Goal',
	items: [
		{
			id: randomUUID(),
			kind: 'task',
			title: 'Task',
			description: 'Work',
			status: 'pending',
			dependsOn: [],
			startedAt: null,
			endedAt: null,
		},
	],
};
const record: AgentPlanRecord = {
	id: randomUUID(),
	threadId: 'thread',
	revision: 1,
	formatVersion: 1,
	data,
	closedAt: null,
	createdAt: new Date('2026-09-24T10:00:00Z'),
	updatedAt: new Date('2026-09-24T10:00:00Z'),
};
const write = { threadId: record.threadId, planId: record.id, expectedRevision: 1 };

beforeEach(() => {
	vi.resetAllMocks();
	repository.findPlan.mockResolvedValue(record);
	repository.createActivePlan.mockResolvedValue(record);
	repository.replacePlan.mockImplementation(async (input) => ({
		...record,
		data: input.data,
		revision: 2,
	}));
});

describe('AgentPlanService', () => {
	it('creates a typed plan with derived readiness and passes the transaction context', async () => {
		const input = { id: record.id, threadId: record.threadId, formatVersion: 1, data };
		expect(await service.createActivePlan(input, ctx)).toMatchObject({
			data,
			readiness: { ready: [data.items[0].id], blocked: [] },
		});
		expect(repository.createActivePlan).toHaveBeenCalledWith(input, ctx);
	});

	it.each([2, 0])('rejects format %s before writing', async (formatVersion) => {
		await expect(service.createActivePlan({ ...record, formatVersion }, ctx)).rejects.toThrow(
			'Unsupported plan format',
		);
		await expect(service.replacePlan({ ...write, formatVersion, data }, ctx)).rejects.toThrow(
			'Unsupported plan format',
		);
		expect(repository.createActivePlan).not.toHaveBeenCalled();
		expect(repository.replacePlan).not.toHaveBeenCalled();
	});

	it('rejects invalid updates without writing', async () => {
		await expect(
			service.replacePlan({ ...write, formatVersion: 1, data: { ...data, extra: true } }, ctx),
		).rejects.toThrow(AgentPlanValidationError);
		expect(repository.replacePlan).not.toHaveBeenCalled();
	});

	it('reads a scoped revision before validating and replacing the full document', async () => {
		const proposed = { ...data, items: [{ ...data.items[0], status: 'done' }] };
		const next = await service.replacePlan({ ...write, formatVersion: 1, data: proposed }, ctx);
		expect(repository.findPlan).toHaveBeenCalledWith(record.threadId, record.id, ctx);
		expect(repository.replacePlan).toHaveBeenCalledWith(
			{
				...write,
				formatVersion: 1,
				data: next.data,
			},
			ctx,
		);
		expect(next.data.items[0]).toMatchObject({
			status: 'done',
			startedAt: expect.any(String),
			endedAt: expect.any(String),
		});
		expect(next.readiness).toEqual({ ready: [], blocked: [] });
		expect(record.data).toEqual(data);
	});

	it.each([
		['missing', null],
		['closed', { ...record, closedAt: new Date() }],
		['stale', { ...record, revision: 2 }],
	] as const)('rejects %s targets before replacing or closing', async (_label, current) => {
		repository.findPlan.mockResolvedValue(current);
		await expect(service.replacePlan({ ...write, formatVersion: 1, data }, ctx)).rejects.toThrow(
			AgentPlanWriteConflictError,
		);
		await expect(service.closePlan(write, ctx)).rejects.toThrow(AgentPlanWriteConflictError);
		expect(repository.replacePlan).not.toHaveBeenCalled();
		expect(repository.closePlan).not.toHaveBeenCalled();
	});

	it('propagates a conflict after validation without retrying', async () => {
		const conflict = new AgentPlanWriteConflictError();
		repository.replacePlan.mockRejectedValue(conflict);
		await expect(service.replacePlan({ ...write, formatVersion: 1, data }, ctx)).rejects.toBe(
			conflict,
		);
		expect(repository.replacePlan).toHaveBeenCalledTimes(1);
	});

	it('propagates duplicate creation errors without retrying', async () => {
		const conflict = new AgentPlanWriteConflictError();
		repository.createActivePlan.mockRejectedValue(conflict);
		await expect(service.createActivePlan(record, ctx)).rejects.toBe(conflict);
		expect(repository.createActivePlan).toHaveBeenCalledTimes(1);
	});

	it('returns typed active, current, and historical documents without persisting readiness', async () => {
		const revision = {
			planId: record.id,
			revision: 1,
			formatVersion: 1,
			data,
			closedAt: null,
			createdAt: record.createdAt,
		};
		repository.findActivePlan.mockResolvedValue(record);
		repository.findRevision.mockResolvedValue(revision);
		const expected = { data, readiness: { ready: [data.items[0].id], blocked: [] } };
		expect(await service.findActivePlan(record.threadId, ctx)).toMatchObject(expected);
		expect(await service.findPlan(record.threadId, record.id, ctx)).toMatchObject(expected);
		expect(await service.findRevision(record.threadId, record.id, 1, ctx)).toMatchObject({
			...revision,
			...expected,
		});
		expect(repository.findActivePlan).toHaveBeenCalledWith(record.threadId, ctx);
		expect(repository.findRevision).toHaveBeenCalledWith(record.threadId, record.id, 1, ctx);
		expect(repository.replacePlan).not.toHaveBeenCalled();
	});

	it('returns null for missing reads', async () => {
		repository.findPlan.mockResolvedValue(null);
		repository.findActivePlan.mockResolvedValue(null);
		repository.findRevision.mockResolvedValue(null);
		expect(await service.findActivePlan('other-thread', ctx)).toBeNull();
		expect(await service.findPlan('other-thread', record.id, ctx)).toBeNull();
		expect(await service.findRevision('other-thread', record.id, 1, ctx)).toBeNull();
	});

	it.each([
		{ ...record, formatVersion: 2 },
		{ ...record, data: { ...data, extra: true } },
	])('rejects unsupported stored documents on reads and closure', async (unsupported) => {
		repository.findPlan.mockResolvedValue(unsupported);
		await expect(service.findPlan(record.threadId, record.id, ctx)).rejects.toThrow(
			AgentPlanValidationError,
		);
		await expect(service.closePlan(write, ctx)).rejects.toThrow(AgentPlanValidationError);
		expect(repository.closePlan).not.toHaveBeenCalled();
	});

	it('delegates history pagination without decoding document content', async () => {
		const history = {
			items: [{ revision: 1, formatVersion: 1, closedAt: null, createdAt: record.createdAt }],
			nextCursor: 1,
		};
		repository.listHistory.mockResolvedValue(history);
		expect(
			await service.listHistory(record.threadId, record.id, { afterRevision: 0, limit: 1 }, ctx),
		).toBe(history);
		expect(repository.listHistory).toHaveBeenCalledWith(
			record.threadId,
			record.id,
			{ afterRevision: 0, limit: 1 },
			ctx,
		);
	});

	it('closes without changing item statuses or returning ready work', async () => {
		repository.closePlan.mockResolvedValue({ ...record, revision: 2, closedAt: new Date() });
		const result = await service.closePlan(write, ctx);
		expect(result.data).toEqual(data);
		expect(result.readiness).toEqual({ ready: [], blocked: [] });
		expect(repository.closePlan).toHaveBeenCalledWith(write, ctx);
	});
});
