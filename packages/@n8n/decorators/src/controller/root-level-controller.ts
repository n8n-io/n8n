import { Container, Service } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Defines a controller that should be registered on the root path, without any prefix
 * @param basePath defaults to `/`
 * @returns ClassDecorator
 */
export const RootLevelController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target) => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			target as unknown as Controller,
		);
		metadata.basePath = basePath;
		metadata.registerOnRootPath = true;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
