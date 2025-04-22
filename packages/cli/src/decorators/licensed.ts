import { Container } from '@n8n/di';

import type { BooleanLicenseFeature } from '@/interfaces';

import { MetadataState } from './metadata-state';
import type { Controller } from './types';

export const Licensed =
	(licenseFeature: BooleanLicenseFeature): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(MetadataState).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.licenseFeature = licenseFeature;
	};
