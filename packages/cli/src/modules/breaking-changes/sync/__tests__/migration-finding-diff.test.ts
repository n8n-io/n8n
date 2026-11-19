import type { MigrationFindingStatus } from '@n8n/api-types';

import type { MigrationFinding } from '../../database/entities/migration-finding.entity';
import { diffMigrationFindings } from '../migration-finding-diff';

const TARGET_VERSION = 'v2';

function existingRow(
	id: number,
	ruleId: string,
	workflowId: string,
	status: MigrationFindingStatus,
): MigrationFinding {
	return {
		id,
		targetVersion: TARGET_VERSION,
		ruleId,
		workflowId,
		status,
		note: null,
		notifiedAt: null,
		statusChangedAt: new Date('2026-01-01T00:00:00.000Z'),
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
	} as MigrationFinding;
}

describe('diffMigrationFindings', () => {
	it('inserts an open finding for a hit that has no row', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			existing: [],
		});

		expect(diff).toEqual({
			toInsert: [
				{ targetVersion: TARGET_VERSION, ruleId: 'rule-a', workflowId: 'wf-1', status: 'open' },
			],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('changes nothing for a hit that already has an open row', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			existing: [existingRow(1, 'rule-a', 'wf-1', 'open')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('reopens a fixed row when the hit returns', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			existing: [existingRow(7, 'rule-a', 'wf-1', 'fixed')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [7],
		});
	});

	it('marks an open row fixed when the hit is gone', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [],
			existing: [existingRow(3, 'rule-a', 'wf-1', 'open')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [3],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('changes nothing for a fixed row when the hit is still gone', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [],
			existing: [existingRow(3, 'rule-a', 'wf-1', 'fixed')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('keeps a wont_fix row as it is while the hit remains', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			existing: [existingRow(4, 'rule-a', 'wf-1', 'wont_fix')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('marks a wont_fix row fixed when the hit is gone', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [],
			existing: [existingRow(4, 'rule-a', 'wf-1', 'wont_fix')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [4],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('keeps a notified row as it is while the hit remains', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			existing: [existingRow(5, 'rule-a', 'wf-1', 'notified')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('marks a notified row fixed when the hit is gone', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [],
			existing: [existingRow(5, 'rule-a', 'wf-1', 'notified')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [5],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('marks a fixed_unpublished row fixed when no version has the hit', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [],
			existing: [existingRow(1, 'rule-a', 'wf-1', 'fixed_unpublished')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [1],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	it('reopens a fixed_unpublished row when the latest version has the hit again', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			existing: [existingRow(1, 'rule-a', 'wf-1', 'fixed_unpublished')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [1],
		});
	});

	describe('published version', () => {
		const publishedHit = { ruleId: 'rule-a', workflowId: 'wf-1' };

		it('keeps a wont_fix row as it is while the published version has the hit', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [],
				publishedHits: [publishedHit],
				existing: [existingRow(1, 'rule-a', 'wf-1', 'wont_fix')],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it.each<MigrationFindingStatus>(['open', 'notified', 'fixed'])(
			'marks a %s row fixed_unpublished when only the published version has the hit',
			(status) => {
				const diff = diffMigrationFindings({
					targetVersion: TARGET_VERSION,
					workflowIds: ['wf-1'],
					hits: [],
					publishedHits: [publishedHit],
					existing: [existingRow(1, 'rule-a', 'wf-1', status)],
				});

				expect(diff).toEqual({
					toInsert: [],
					toMarkFixed: [],
					toMarkFixedUnpublished: [1],
					toReopen: [],
				});
			},
		);

		it('changes nothing for a fixed_unpublished row while only the published version has the hit', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [],
				publishedHits: [publishedHit],
				existing: [existingRow(1, 'rule-a', 'wf-1', 'fixed_unpublished')],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it('inserts a fixed_unpublished finding when only the published version has the hit', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [],
				publishedHits: [publishedHit],
				existing: [],
			});

			expect(diff).toEqual({
				toInsert: [{ ...publishedHit, targetVersion: TARGET_VERSION, status: 'fixed_unpublished' }],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it('ignores a published hit for a workflow outside the batch', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-2'],
				hits: [],
				publishedHits: [publishedHit],
				existing: [],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it('keeps a row as it is when the check is unknown', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [],
				publishedHits: [publishedHit],
				existing: [existingRow(1, 'rule-a', 'wf-1', 'open')],
				unknown: [publishedHit],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});
	});

	it('handles two rules on one workflow independently', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [
				{ ruleId: 'rule-a', workflowId: 'wf-1' },
				{ ruleId: 'rule-c', workflowId: 'wf-1' },
			],
			existing: [
				existingRow(1, 'rule-a', 'wf-1', 'fixed'),
				existingRow(2, 'rule-b', 'wf-1', 'open'),
			],
		});

		expect(diff).toEqual({
			toInsert: [
				{ targetVersion: TARGET_VERSION, ruleId: 'rule-c', workflowId: 'wf-1', status: 'open' },
			],
			toMarkFixed: [2],
			toMarkFixedUnpublished: [],
			toReopen: [1],
		});
	});

	it('ignores hits and rows for workflows outside the batch', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: ['wf-1'],
			hits: [{ ruleId: 'rule-a', workflowId: 'wf-9' }],
			existing: [existingRow(1, 'rule-a', 'wf-8', 'open')],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});

	describe('unknown pairs', () => {
		it('keeps an open row open when the check is unknown', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [],
				existing: [existingRow(1, 'rule-a', 'wf-1', 'open')],
				unknown: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it('keeps a wont_fix row as it is when the check is unknown', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [],
				existing: [existingRow(1, 'rule-a', 'wf-1', 'wont_fix')],
				unknown: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it('inserts nothing for an unknown check without a row, even when a hit is given', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
				existing: [],
				unknown: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it('does not reopen a fixed row when the check is unknown', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
				existing: [existingRow(3, 'rule-a', 'wf-1', 'fixed')],
				unknown: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			});

			expect(diff).toEqual({
				toInsert: [],
				toMarkFixed: [],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});

		it('still transitions the other rules on the same workflow', () => {
			const diff = diffMigrationFindings({
				targetVersion: TARGET_VERSION,
				workflowIds: ['wf-1'],
				hits: [{ ruleId: 'rule-b', workflowId: 'wf-1' }],
				existing: [
					existingRow(1, 'rule-a', 'wf-1', 'open'),
					existingRow(2, 'rule-c', 'wf-1', 'open'),
					existingRow(3, 'rule-d', 'wf-1', 'fixed'),
				],
				unknown: [{ ruleId: 'rule-a', workflowId: 'wf-1' }],
			});

			expect(diff).toEqual({
				toInsert: [
					{ targetVersion: TARGET_VERSION, ruleId: 'rule-b', workflowId: 'wf-1', status: 'open' },
				],
				toMarkFixed: [2],
				toMarkFixedUnpublished: [],
				toReopen: [],
			});
		});
	});

	it('returns an empty diff for empty inputs', () => {
		const diff = diffMigrationFindings({
			targetVersion: TARGET_VERSION,
			workflowIds: [],
			hits: [],
			existing: [],
		});

		expect(diff).toEqual({
			toInsert: [],
			toMarkFixed: [],
			toMarkFixedUnpublished: [],
			toReopen: [],
		});
	});
});
