import type { Logger } from '@n8n/backend-common';
import type { WorkflowReviewActivity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { toActivityEntry } from '../workflow-review.mapper';

describe('toActivityEntry', () => {
	const logger = mock<Logger>();

	// The database no longer constrains `type`, so a newer version's rows survive a downgrade —
	// this version must serve them as unknown entries rather than crash the feed.
	it('serves an entry of a type this version does not know rather than dropping it', () => {
		const row = mock<WorkflowReviewActivity>({
			id: 7,
			typeVersion: 1,
			type: 'review.something_newer' as WorkflowReviewActivity['type'],
			data: { anything: true },
			createdById: null,
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
		});

		expect(toActivityEntry(row, [], new Map(), logger)).toEqual({
			id: '7',
			typeVersion: 1,
			type: 'review.something_newer',
			data: null,
			createdBy: null,
			createdAt: '2026-07-20T10:00:00.000Z',
		});
	});

	// Same reason: only a downgrade writes a payload version this code does not know, and its
	// shape may happen to satisfy the version 1 schema while meaning something else.
	it('does not read a newer payload version as if it were the one it knows', () => {
		const row = mock<WorkflowReviewActivity>({
			id: 8,
			typeVersion: 2,
			type: 'review.approved',
			data: {
				workflowVersions: [{ workflowId: 'wf-1', workflowVersionId: 'ver-1' }],
				note: 'Ship it',
			},
			createdById: null,
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
		});

		expect(toActivityEntry(row, [], new Map(), logger).data).toBeNull();
	});

	it.each([
		['workflow.archived', { workflowId: 'wf-1', actorKind: 'user' }],
		['workflow.deleted', { workflowId: 'wf-1', actorKind: 'system' }],
		['workflow.moved', { workflowId: 'wf-1', actorKind: 'user' }],
		['workflow.published', { workflowId: 'wf-1', workflowVersionId: 'ver-1' }],
	] as const)('maps a %s entry with its payload intact', (type, data) => {
		const row = mock<WorkflowReviewActivity>({
			id: 9,
			typeVersion: 1,
			type,
			data,
			createdById: null,
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
		});

		expect(toActivityEntry(row, [], new Map(), logger)).toEqual({
			id: '9',
			typeVersion: 1,
			type,
			data,
			createdBy: null,
			createdAt: '2026-07-20T10:00:00.000Z',
		});
	});

	it.each([
		// An actor kind outside the enum could only come from a newer writer; reading it as
		// either known kind would misattribute the action, so the payload degrades instead.
		['workflow.archived', { workflowId: 'wf-1', actorKind: 'robot' }],
		['workflow.published', { workflowId: 'wf-1' }],
	] as const)('degrades a %s entry whose payload does not parse', (type, data) => {
		const row = mock<WorkflowReviewActivity>({
			id: 10,
			typeVersion: 1,
			type,
			data,
			createdById: null,
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
		});

		expect(toActivityEntry(row, [], new Map(), logger).data).toBeNull();
	});
});
