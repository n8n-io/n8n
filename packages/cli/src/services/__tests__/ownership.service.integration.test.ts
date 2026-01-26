import { testDb } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';

import { HooksService } from '@/services/hooks.service';
import { OwnershipService } from '@/services/ownership.service';
import { createUserShell } from '@test-integration/db/users';

let hookService: HooksService;
let ownershipService: OwnershipService;

// See PAY-4247 - This test case can be deleted when the ticket is complete
describe('Ownership Service integration test', () => {
	beforeEach(async () => {
		await testDb.truncate(['User']);
		await createUserShell(GLOBAL_OWNER_ROLE);
		jest.clearAllMocks();
	});

	beforeAll(async () => {
		await testDb.init();
		hookService = Container.get(HooksService);
		ownershipService = Container.get(OwnershipService);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('should recognise ownership creation from cloud hooks', async () => {
		expect(await ownershipService.hasInstanceOwner()).toBeFalsy();
		const shellOwnerUser = await hookService.findOneUser({
			where: {
				role: {
					slug: GLOBAL_OWNER_ROLE.slug,
				},
			},
		});
		// @ts-expect-error - this is how this function is called in the cloud hook so I match it here
		await hookService.saveUser({
			firstName: 'FN',
			lastName: 'LN',
			email: 'fn@ln.com',
			password: '<hashed_password>',
			id: shellOwnerUser!.id,
		});
		expect(await ownershipService.hasInstanceOwner()).toBeTruthy();
	});

	it('should recognise ownership creation from api', async () => {
		expect(await ownershipService.hasInstanceOwner()).toBeFalsy();
		await ownershipService.setupOwner({
			firstName: 'TEST',
			lastName: 'LN',
			password: 'PW',
			email: 'EM@em.com',
		});
		expect(await ownershipService.hasInstanceOwner()).toBeTruthy();
	});
});
