import type { BooleanLicenseFeature } from '@/Interfaces';
import { getRouteMetadata } from './controller.registry';

export const Licensed =
	(licenseFeature: BooleanLicenseFeature): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = getRouteMetadata(target.constructor, String(handlerName));
		routeMetadata.licenseFeature = licenseFeature;
	};
