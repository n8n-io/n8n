import { Service } from 'typedi';
import { CONTROLLER_BASE_PATH } from './constants';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target: object) => {
		Reflect.defineMetadata(CONTROLLER_BASE_PATH, basePath, target);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
