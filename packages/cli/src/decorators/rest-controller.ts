import { Service } from '@n8n/di';

import { getControllerMetadata } from './controller.registry';
import type { Controller } from './types';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target) => {
		const metadata = getControllerMetadata(target as unknown as Controller);
		metadata.basePath = basePath;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
