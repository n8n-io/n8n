import { Container, Service } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

interface RestControllerOptions {
	skipPrefix?: boolean;
}

export const RestController =
	(basePath: `/${string}` = '/', options?: RestControllerOptions): ClassDecorator =>
	(target) => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			target as unknown as Controller,
		);
		metadata.basePath = basePath;
		metadata.skipPrefix = options?.skipPrefix;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
