import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { LicenseController } from '../license.controller';

describe('LicenseController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		LicenseController as Controller,
	);

	it('gates registerCommunityEdition behind license:manage', () => {
		expect(metadata.routes.get('registerCommunityEdition')?.accessScope).toEqual({
			scope: 'license:manage',
			globalOnly: true,
		});
	});

	it.each(['requestEnterpriseTrial', 'activateLicense', 'renewLicense'])(
		'%s is gated behind license:manage',
		(handler) => {
			expect(metadata.routes.get(handler)?.accessScope).toEqual({
				scope: 'license:manage',
				globalOnly: true,
			});
		},
	);
});
