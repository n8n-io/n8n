import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { createSkillServices } from './test-utils/skill-services';

describe('SkillService protected promotion writes', () => {
	it('keeps package imports protected during and after an authorized Apply', async () => {
		const { service, instanceWriteAccess } = createSkillServices();
		instanceWriteAccess.setReadOnly(true);
		const entered = createDeferredPromise<undefined>();
		const finish = createDeferredPromise<undefined>();
		const promotion = service.runPromotion(async () => {
			expect(() => service.assertWritable()).not.toThrow();
			entered.resolve(undefined);
			await finish.promise;
			expect(() => service.assertWritable()).not.toThrow();
		});
		await entered.promise;
		expect(() => service.assertWritable()).toThrow('protected instance');
		finish.resolve(undefined);
		await promotion;
		expect(() => service.assertWritable()).toThrow('protected instance');
	});

	it('restores protection after an Apply failure', async () => {
		const { service, instanceWriteAccess } = createSkillServices();
		instanceWriteAccess.setReadOnly(true);
		await expect(
			service.runPromotion(async () => {
				throw new Error('Apply failed');
			}),
		).rejects.toThrow('Apply failed');
		expect(() => service.assertWritable()).toThrow('protected instance');
	});
});
