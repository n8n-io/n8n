import { Container, Service } from '@n8n/di';

import { MetadataState } from './metadata-state';
import type { Controller } from './types';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target) => {
		const metadata = Container.get(MetadataState).getControllerMetadata(
			target as unknown as Controller,
		);
		metadata.basePath = basePath;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
