import type { BooleanLicenseFeature } from '@/Interfaces';
import type { LicenseMetadata } from './types';
import { CONTROLLER_LICENSE_FEATURES } from './constants';

export const Licensed = (features: BooleanLicenseFeature | BooleanLicenseFeature[]) => {
	// eslint-disable-next-line @typescript-eslint/ban-types
	return (target: Function | object, handlerName?: string) => {
		const controllerClass = handlerName ? target.constructor : target;
		const license = (Reflect.getMetadata(CONTROLLER_LICENSE_FEATURES, controllerClass) ??
			{}) as LicenseMetadata;
		license[handlerName ?? '*'] = Array.isArray(features) ? features : [features];
		Reflect.defineMetadata(CONTROLLER_LICENSE_FEATURES, license, controllerClass);
	};
};
