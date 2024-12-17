import type { BooleanLicenseFeature } from '@/interfaces';

import { getRouteMetadata } from './controller.registry';
import type { Controller } from './types';

export const Licensed =
	(licenseFeature: BooleanLicenseFeature): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = getRouteMetadata(target.constructor as Controller, String(handlerName));
		routeMetadata.licenseFeature = licenseFeature;
	};
