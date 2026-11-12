import { testDb } from '@n8n/backend-test-utils';
import {
	GLOBAL_MEMBER_ROLE,
	LicenseMetricsRepository,
	Person,
	ServiceAccount,
	type User,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ExternalHooks } from '@/external-hooks';
import { HooksService } from '@/services/hooks.service';

import { createMember, createUser } from '../shared/db/users';

/*
 * The person columns live on `Person`, so the compiler rejects a read of them
 * on a `User`. These tests check the parts the compiler cannot see. The
 * relation targets are checked in `user-relation-targets.test.ts`.
 */
describe('Person boundary', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Project', 'User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createServiceAccount() {
		return await createUser({ kind: 'service', name: 'Deploy bot', role: GLOBAL_MEMBER_ROLE });
	}

	describe('counts', () => {
		it('a service account raises the user count, but not the person count or the seat count', async () => {
			const userRepository = Container.get(UserRepository);
			const personTable = Container.get(DataSource).getRepository(Person);
			const licenseMetrics = Container.get(LicenseMetricsRepository);
			await createMember();

			const usersBefore = await userRepository.count();
			const peopleBefore = await personTable.count();
			const seatsBefore = await licenseMetrics.getLicenseRenewalMetrics();

			await createServiceAccount();

			const seatsAfter = await licenseMetrics.getLicenseRenewalMetrics();
			expect(await userRepository.count()).toBe(usersBefore + 1);
			expect(await personTable.count()).toBe(peopleBefore);
			expect(seatsAfter.enabledUsers).toBe(seatsBefore.enabledUsers);
			expect(seatsAfter.totalUsers).toBe(seatsBefore.totalUsers);
		});
	});

	describe('cloud hooks', () => {
		it('the hooks service returns people only', async () => {
			const person = await createMember();
			const serviceAccount = await createServiceAccount();
			const hooksService = Container.get(HooksService);

			const found = await hooksService.dbCollections().User.find();

			expect(found.map(({ id }) => id)).toEqual([person.id]);
			expect(await hooksService.findOneUser({ where: { id: serviceAccount.id } })).toBeNull();
			expect(await hooksService.findOneUser({ where: { id: person.id } })).toBeInstanceOf(Person);
		});

		it('the external hooks context returns people only', async () => {
			const person = await createMember();
			await createServiceAccount();
			const externalHooks = Container.get(ExternalHooks);
			let found: User[] = [];
			externalHooks['registered']['user.invited'] = [
				async function (this: { dbCollections: { User: { find(): Promise<User[]> } } }) {
					found = await this.dbCollections.User.find();
				},
			];

			await externalHooks.run('user.invited', [[]]);

			expect(found.map(({ id }) => id)).toEqual([person.id]);
			expect(found.some((account) => account instanceof ServiceAccount)).toBe(false);
		});
	});
});
