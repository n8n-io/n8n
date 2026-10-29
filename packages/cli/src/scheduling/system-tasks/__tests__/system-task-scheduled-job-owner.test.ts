import { ScheduledJobOwnerType } from '@n8n/constants';
import type { ScheduledJob, ScheduledJobRepository } from '@n8n/db';
import { inc } from 'semver';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';

import { SystemTaskScheduledJobOwner } from '../system-task-scheduled-job-owner';

const NEWER_VERSION = inc(N8N_VERSION, 'minor') as string;
const OLDER_VERSION = '0.0.1';

const row = (
	ownerId: string,
	payload: Record<string, unknown>,
): Pick<ScheduledJob, 'ownerId' | 'payload'> => ({ ownerId, payload });

describe('SystemTaskScheduledJobOwner', () => {
	let jobs: ReturnType<typeof mock<ScheduledJobRepository>>;
	let owner: SystemTaskScheduledJobOwner;

	beforeEach(() => {
		jobs = mock<ScheduledJobRepository>();
		owner = new SystemTaskScheduledJobOwner(jobs);
	});

	it('claims the system-task owner type', () => {
		expect(owner.ownerType).toBe(ScheduledJobOwnerType.SystemTask);
	});

	it('owns a task by name, with no member', () => {
		expect(owner.owner('prune-executions')).toEqual({
			ownerType: 'system-task',
			ownerId: 'prune-executions',
			ownerMemberId: null,
		});
	});

	describe('findExisting', () => {
		it('reports a task this instance runs durably as existing, without reading its row', async () => {
			owner.declareDurable('prune-executions');

			await expect(owner.findExisting(['prune-executions'])).resolves.toEqual(
				new Set(['prune-executions']),
			);
			expect(jobs.findPayloadsByOwnerIds).not.toHaveBeenCalled();
		});

		it('reports a task nothing declared as gone', async () => {
			jobs.findPayloadsByOwnerIds.mockResolvedValue([row('prune-executions', {})]);

			await expect(owner.findExisting(['prune-executions'])).resolves.toEqual(new Set());
		});

		it('reports a task stamped by a newer version as existing', async () => {
			jobs.findPayloadsByOwnerIds.mockResolvedValue([
				row('prune-executions', { n8nVersion: NEWER_VERSION }),
			]);

			await expect(owner.findExisting(['prune-executions'])).resolves.toEqual(
				new Set(['prune-executions']),
			);
		});

		it.each([N8N_VERSION, OLDER_VERSION])(
			'reports a task stamped by version %s, not newer than this one, as gone',
			async (n8nVersion) => {
				jobs.findPayloadsByOwnerIds.mockResolvedValue([row('prune-executions', { n8nVersion })]);

				await expect(owner.findExisting(['prune-executions'])).resolves.toEqual(new Set());
			},
		);

		it.each(['not-a-version', 42, null])(
			'reports a task whose stamp is %s, which no version compares to, as gone',
			async (n8nVersion) => {
				jobs.findPayloadsByOwnerIds.mockResolvedValue([row('prune-executions', { n8nVersion })]);

				await expect(owner.findExisting(['prune-executions'])).resolves.toEqual(new Set());
			},
		);

		it('reads the rows of the undeclared tasks only', async () => {
			owner.declareDurable('prune-executions');
			jobs.findPayloadsByOwnerIds.mockResolvedValue([
				row('compact-insights', { n8nVersion: NEWER_VERSION }),
			]);

			await expect(
				owner.findExisting(['prune-executions', 'compact-insights', 'renew-license']),
			).resolves.toEqual(new Set(['prune-executions', 'compact-insights']));
			expect(jobs.findPayloadsByOwnerIds).toHaveBeenCalledExactlyOnceWith('system-task', [
				'compact-insights',
				'renew-license',
			]);
		});

		it('rejects when the rows cannot be read, so the sweep leaves the jobs alone', async () => {
			const error = new Error('connection lost');
			jobs.findPayloadsByOwnerIds.mockRejectedValue(error);

			await expect(owner.findExisting(['prune-executions'])).rejects.toBe(error);
		});
	});
});
