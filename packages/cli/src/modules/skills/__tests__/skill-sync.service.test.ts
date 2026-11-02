import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SkillSourceConnection } from '../database/entities/skill-source-connection.entity';
import type { SkillSourceLink } from '../database/entities/skill-source-link.entity';
import type { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import type { SkillAccessService } from '../services/skill-access.service';
import type { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';
import { SkillSyncService } from '../services/skill-sync.service';
import type { SkillsTelemetry } from '../services/skills-telemetry.service';

describe('SkillSyncService', () => {
	const flagGate = mock<SkillSyncFlagGate>();
	const access = mock<SkillAccessService>();
	const sources = mock<SkillSourceRepository>();
	const telemetry = mock<SkillsTelemetry>();
	const service = new SkillSyncService(
		mock(),
		flagGate,
		access,
		sources,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		telemetry,
	);
	const user = mock<User>({ id: 'user-1' });
	const source = mock<SkillSourceConnection>({ id: 'source-1', type: 'github', projectId: 'p1' });

	const givenLink = (pendingContentHash: string | null) =>
		sources.findLinkBySkillId.mockResolvedValue(
			mock<SkillSourceLink>({ skillId: 'skill_a', sourceId: 'source-1', pendingContentHash }),
		);

	beforeEach(() => {
		vi.resetAllMocks();
		sources.findById.mockResolvedValue(source);
		access.canOnSource.mockResolvedValue(true);
		sources.deleteLink.mockResolvedValue(true);
	});

	describe('stopSyncing', () => {
		it.each([
			{ pending: null, hadPendingUpdate: false },
			{ pending: 'hash-of-update', hadPendingUpdate: true },
		])(
			'deletes the link and tracks had_pending_update $hadPendingUpdate',
			async ({ pending, hadPendingUpdate }) => {
				givenLink(pending);

				await service.stopSyncing(user, 'skill_a');

				expect(sources.deleteLink).toHaveBeenCalledWith('skill_a');
				expect(telemetry.stoppedSync).toHaveBeenCalledTimes(1);
				expect(telemetry.stoppedSync).toHaveBeenCalledWith(
					{ provider: 'github', had_pending_update: hadPendingUpdate },
					'user-1',
				);
			},
		);

		it('tracks nothing when a stop at the same time removed the link first', async () => {
			givenLink(null);
			sources.deleteLink.mockResolvedValue(false);

			await service.stopSyncing(user, 'skill_a');

			expect(telemetry.stoppedSync).not.toHaveBeenCalled();
		});

		it('answers 404 for a skill without a link, and tracks nothing', async () => {
			sources.findLinkBySkillId.mockResolvedValue(null);

			await expect(service.stopSyncing(user, 'skill_a')).rejects.toThrow(NotFoundError);
			expect(sources.deleteLink).not.toHaveBeenCalled();
			expect(telemetry.stoppedSync).not.toHaveBeenCalled();
		});

		it('answers 403 for a user who cannot change the source, and tracks nothing', async () => {
			givenLink(null);
			access.canOnSource.mockResolvedValue(false);

			await expect(service.stopSyncing(user, 'skill_a')).rejects.toThrow(ForbiddenError);
			expect(access.canOnSource).toHaveBeenCalledWith(user, source, 'stopSyncing');
			expect(sources.deleteLink).not.toHaveBeenCalled();
			expect(telemetry.stoppedSync).not.toHaveBeenCalled();
		});
	});
});
