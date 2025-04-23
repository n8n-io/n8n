import type { BooleanLicenseFeature } from '@n8n/constants';

import { getRouteMetadata } from './controller.registry';
import type { Controller } from './types';

export const Licensed =
	(licenseFeature: BooleanLicenseFeature): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = getRouteMetadata(target.constructor as Controller, String(handlerName));
		routeMetadata.licenseFeature = licenseFeature;
	};
