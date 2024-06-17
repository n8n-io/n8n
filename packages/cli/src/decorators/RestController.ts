import { Service } from 'typedi';
import { getControllerMetadata } from './controller.registry';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target) => {
		const metadata = getControllerMetadata(target);
		metadata.basePath = basePath;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
