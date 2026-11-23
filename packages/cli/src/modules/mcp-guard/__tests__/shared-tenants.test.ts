import { GymAdmin } from '../gym-admin';
import { SharedTenantAdmin } from '../shared-tenants';

describe('SharedTenantAdmin', () => {
	afterEach(() => vi.restoreAllMocks());

	function setup() {
		const create = vi.spyOn(GymAdmin.prototype, 'createTenant').mockResolvedValue();
		const remove = vi.spyOn(GymAdmin.prototype, 'deleteTenant').mockResolvedValue();
		return { admin: new SharedTenantAdmin('http://gym'), create, remove };
	}

	it('makes a tenant once for the vendors of a chat', async () => {
		const { admin, create } = setup();

		await Promise.all([admin.createTenant('guard-a'), admin.createTenant('guard-a')]);
		await admin.createTenant('guard-a');

		expect(create).toHaveBeenCalledTimes(1);
	});

	it('makes a tenant for each chat', async () => {
		const { admin, create } = setup();

		await admin.createTenant('guard-a');
		await admin.createTenant('guard-b');

		expect(create).toHaveBeenCalledTimes(2);
	});

	it('deletes the tenant only with the last vendor', async () => {
		const { admin, remove } = setup();
		await admin.createTenant('guard-a');
		await admin.createTenant('guard-a');

		await admin.deleteTenant('guard-a');
		expect(remove).not.toHaveBeenCalled();

		await admin.deleteTenant('guard-a');
		expect(remove).toHaveBeenCalledTimes(1);
	});

	it('makes the tenant again after the delete', async () => {
		const { admin, create } = setup();
		await admin.createTenant('guard-a');
		await admin.deleteTenant('guard-a');

		await admin.createTenant('guard-a');

		expect(create).toHaveBeenCalledTimes(2);
	});

	it('keeps the holder when the gym fails to delete, so the next call tries again', async () => {
		const { admin, remove } = setup();
		await admin.createTenant('guard-a');
		remove.mockRejectedValueOnce(new Error('down'));

		await expect(admin.deleteTenant('guard-a')).rejects.toThrow('down');
		await admin.deleteTenant('guard-a');

		expect(remove).toHaveBeenCalledTimes(2);
	});

	it('does not count a vendor whose tenant creation failed', async () => {
		const { admin, create, remove } = setup();
		create.mockRejectedValueOnce(new Error('down'));

		await expect(admin.createTenant('guard-a')).rejects.toThrow('down');
		await admin.createTenant('guard-a');
		await admin.deleteTenant('guard-a');

		expect(remove).toHaveBeenCalledTimes(1);
	});

	it('gives the vendors of a tenant one state, and drops it with the tenant', async () => {
		const { admin } = setup();
		await admin.createTenant('guard-a');
		await admin.createTenant('guard-a');

		const first = admin.stateFor('guard-a');
		first.gymIds.add('made-1');
		expect(admin.stateFor('guard-a').gymIds.has('made-1')).toBe(true);
		expect(admin.stateFor('guard-b')).not.toBe(first);

		await admin.deleteTenant('guard-a');
		expect(admin.stateFor('guard-a').gymIds.has('made-1')).toBe(true);
		await admin.deleteTenant('guard-a');
		expect(admin.stateFor('guard-a').gymIds.has('made-1')).toBe(false);
	});
});
