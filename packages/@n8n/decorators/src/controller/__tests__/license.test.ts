import type { BooleanLicenseFeature } from '@n8n/constants';
import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Licensed } from '../licensed';
import type { Controller } from '../types';

describe('@Licensed Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should set license feature on route metadata', () => {
		const licenseFeature: BooleanLicenseFeature = 'feat:variables';

		class TestController {
			@Licensed(licenseFeature)
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.licenseFeature).toBe(licenseFeature);
	});

	it('should work with different license features', () => {
		class TestController {
			@Licensed('feat:ldap')
			ldapMethod() {}

			@Licensed('feat:saml')
			samlMethod() {}

			@Licensed('feat:sharing')
			sharingMethod() {}
		}

		const ldapMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'ldapMethod',
		);
		expect(ldapMetadata.licenseFeature).toBe('feat:ldap');

		const samlMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'samlMethod',
		);
		expect(samlMetadata.licenseFeature).toBe('feat:saml');

		const sharingMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'sharingMethod',
		);
		expect(sharingMetadata.licenseFeature).toBe('feat:sharing');
	});

	it('should work alongside other decorators', () => {
		// Assuming we have a Get decorator imported
		const Get = (path: string) => {
			return (target: object, handlerName: string | symbol) => {
				const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
					target.constructor as Controller,
					String(handlerName),
				);
				routeMetadata.method = 'get';
				routeMetadata.path = path;
			};
		};

		class TestController {
			@Get('/test')
			@Licensed('feat:variables')
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.licenseFeature).toBe('feat:variables');
		expect(routeMetadata.method).toBe('get');
		expect(routeMetadata.path).toBe('/test');
	});
});
