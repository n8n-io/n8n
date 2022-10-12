import { parsePermissionsTable } from '@/permissions';
import { IUser } from "@/Interface";

describe('parsePermissionsTable()', () => {
	const user: IUser = {
		id: "1",
		firstName: "John",
		lastName: "Doe",
		isDefaultUser: false,
		isOwner: true,
		isPending: false,
		isPendingUser: false,
	};

	it('should return permissions object using generic permissions table', () => {
		const permissions = parsePermissionsTable(user, []);

		expect(permissions.isInstanceOwner).toBe(true);
	});

	it('should set permission based on permissions table row test function', () => {
		const permissions = parsePermissionsTable(user, [
			{ name: 'canRead', test: () => true },
			{ name: 'canUpdate', test: () => false },
		]);

		expect(permissions.canRead).toBe(true);
		expect(permissions.canUpdate).toBe(false);
	});

	it('should set permission based on previously computed permission', () => {
		const permissions = parsePermissionsTable(user, [
			{ name: 'canRead', test: ['isInstanceOwner'] },
		]);

		expect(permissions.canRead).toBe(true);
	});

	it('should set permission based on multiple previously computed permissions', () => {
		const permissions = parsePermissionsTable(user, [
			{ name: 'isResourceOwner', test: ['isInstanceOwner'] },
			{ name: 'canRead', test: ['isInstanceOwner', 'isResourceOwner'] },
		]);

		expect(permissions.canRead).toBe(true);
	});
});
