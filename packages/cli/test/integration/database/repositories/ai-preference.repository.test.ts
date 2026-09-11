import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { AiPreference, Project, User } from '@n8n/db';
import { AiPreferenceRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { createMember, createOwner } from '../../shared/db/users';

describe('AiPreferenceRepository', () => {
	let repository: AiPreferenceRepository;
	let owner: User;
	let member: User;
	let marketing: Project;
	let sales: Project;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(AiPreferenceRepository);
		owner = await createOwner();
		member = await createMember();
		marketing = await createTeamProject('Marketing');
		sales = await createTeamProject('Sales');
	});

	afterEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertPreference(overrides: Partial<AiPreference> & { content: string }) {
		const id = overrides.id ?? uuid();
		await repository.insert({
			id,
			userId: null,
			projectId: null,
			createdById: owner.id,
			...overrides,
		});
		return id;
	}

	describe('findApplicable', () => {
		it('returns the instance rows, the rows of the user, and the rows of the listed projects', async () => {
			const instanceId = await insertPreference({ content: 'Instance' });
			const ownId = await insertPreference({ content: 'Own', userId: member.id });
			const marketingId = await insertPreference({ content: 'Marketing', projectId: marketing.id });
			await insertPreference({ content: 'Someone else', userId: owner.id });
			await insertPreference({ content: 'Unlisted project', projectId: sales.id });

			const rows = await repository.findApplicable({
				userId: member.id,
				projectIds: [marketing.id],
			});

			expect(rows.map((row) => row.id).sort()).toEqual([instanceId, ownId, marketingId].sort());
		});

		it('returns the rows oldest first, then by id', async () => {
			const older = new Date('2026-01-01T00:00:00.000Z');
			const newer = new Date('2026-01-02T00:00:00.000Z');
			const [tieA, tieB] = [uuid(), uuid()].sort();
			const newestId = await insertPreference({ content: 'Newest', createdAt: newer });
			await insertPreference({ id: tieB, content: 'Tie B', createdAt: older });
			await insertPreference({ id: tieA, content: 'Tie A', createdAt: older });

			const rows = await repository.findApplicable({ userId: member.id, projectIds: [] });

			expect(rows.map((row) => row.id)).toEqual([tieA, tieB, newestId]);
		});

		it('returns only the instance rows and the rows of the user when there are no projects', async () => {
			const instanceId = await insertPreference({ content: 'Instance' });
			const ownId = await insertPreference({ content: 'Own', userId: member.id });
			await insertPreference({ content: 'Project', projectId: marketing.id });

			const rows = await repository.findApplicable({ userId: member.id, projectIds: [] });

			expect(rows.map((row) => row.id).sort()).toEqual([instanceId, ownId].sort());
		});
	});
});
