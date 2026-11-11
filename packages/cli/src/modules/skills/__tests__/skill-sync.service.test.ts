import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { SkillSourceConnection } from '../database/entities/skill-source-connection.entity';
import type { SkillSourceLink } from '../database/entities/skill-source-link.entity';
import type { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import { SkillSourceReadError } from '../errors/skill-source-read.error';
import type { SkillAccessService } from '../services/skill-access.service';
import type { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';
import { SkillSyncService } from '../services/skill-sync.service';
import type { SkillsTelemetry } from '../services/skills-telemetry.service';
import type { SkillSourceClient } from '../sources/skill-source-client';
import type { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';

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
		mock(),
		mock(),
		mock(),
		mock(),
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

	it.each(['current', 'changed'])(
		'keeps a concurrent rate limit after a successful %s probe',
		async (revision) => {
			const clients = mock<SkillSourceClientRegistry>();
			const probe = vi.fn<NonNullable<SkillSourceClient['probe']>>();
			const client = mock<SkillSourceClient>({ probe });
			client.describe.mockReturnValue({ label: 'Skills', ref: 'main', path: '' });
			clients.get.mockReturnValue(client);
			const sync = new SkillSyncService(
				mock(),
				flagGate,
				access,
				sources,
				mock(),
				mock(),
				clients,
				mock(),
				mock(),
				telemetry,
				mock(),
				mock(),
				mock(),
				mock(),
			);
			const firstId = 'a6c11527-f2f8-4dc9-a0e2-d2804c5b219a';
			const secondId = '4795c2a1-f46c-4b7d-a657-a435cedb7181';
			sources.findById.mockImplementation(async (id) =>
				mock<SkillSourceConnection>({
					id,
					type: 'github',
					credentialId: null,
					probeCursor: 'current',
					lastCheckedAt: null,
				}),
			);
			sources.claimCheckNow.mockResolvedValue(true);
			sources.findLinksBySource.mockResolvedValue([]);
			sources.countPendingUpdates.mockResolvedValue(0);
			const started = createDeferredPromise<undefined>();
			const result = createDeferredPromise<string>();
			probe.mockImplementationOnce(async () => {
				started.resolve(undefined);
				return await result.promise;
			});
			probe.mockRejectedValueOnce(new SkillSourceReadError('rate_limited', 'Try again later.'));

			const firstCheck = sync.checkNow(user, firstId);
			await started.promise;
			await expect(sync.checkNow(user, secondId)).rejects.toThrow();
			result.resolve(revision);
			await firstCheck;
			await expect(sync.checkNow(user, secondId)).rejects.toThrow();

			expect(probe).toHaveBeenCalledTimes(2);
			expect(sources.recordDelayed).toHaveBeenCalledWith(secondId);
		},
	);
});
