import { setControllerMetadata, addHttpMethod, addCallable } from './metadata';
import type { HttpMethod } from './types';

export function Controller(basePath: string): ClassDecorator {
	return (target) => {
		setControllerMetadata(target, { basePath });
	};
}

function createHttpMethodDecorator(method: HttpMethod) {
	return (path: string): MethodDecorator =>
		(target, propertyKey) => {
			addHttpMethod(target.constructor, {
				method,
				path,
				propertyKey: String(propertyKey),
			});
		};
}

export const GET = createHttpMethodDecorator('GET');
export const POST = createHttpMethodDecorator('POST');
export const PUT = createHttpMethodDecorator('PUT');
export const DELETE = createHttpMethodDecorator('DELETE');
export const PATCH = createHttpMethodDecorator('PATCH');

export function Callable(description: string): MethodDecorator {
	return (target, propertyKey) => {
		addCallable(target.constructor, {
			description,
			propertyKey: String(propertyKey),
		});
	};
}
