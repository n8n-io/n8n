import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';

import { DurableLeaseService } from '../durable-lease.service';
import { DurableLeasesModule } from '../durable-leases.module';

describe('DurableLeasesModule', () => {
	let service: ReturnType<typeof mockInstance<DurableLeaseService>>;

	beforeEach(() => {
		Container.reset();
		service = mockInstance(DurableLeaseService);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('builds the lease service at startup', async () => {
		const get = vi.spyOn(Container, 'get');

		await new DurableLeasesModule().init();

		expect(get).toHaveBeenCalledWith(DurableLeaseService);
	});

	it('fails startup when the lease service cannot be built', async () => {
		vi.spyOn(Container, 'get').mockImplementation(() => {
			throw new UserError('invalid lease timings');
		});

		await expect(new DurableLeasesModule().init()).rejects.toThrow('invalid lease timings');
	});

	it('stops the lease service it built on shutdown', async () => {
		const module = new DurableLeasesModule();
		await module.init();

		await module.shutdown();

		expect(service.stop).toHaveBeenCalled();
	});

	it('builds no lease service on shutdown when init did not run', async () => {
		const get = vi.spyOn(Container, 'get');

		await new DurableLeasesModule().shutdown();

		expect(get).not.toHaveBeenCalled();
		expect(service.stop).not.toHaveBeenCalled();
	});
});
