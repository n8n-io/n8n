import 'reflect-metadata';

import type {
	CallableMetadata,
	ClassMetadata,
	ControllerMetadata,
	HttpMethodMetadata,
} from './types';

const CONTROLLER_KEY = Symbol('code-engine:controller');
const HTTP_METHODS_KEY = Symbol('code-engine:http-methods');
const CALLABLES_KEY = Symbol('code-engine:callables');

export function setControllerMetadata(target: object, metadata: ControllerMetadata): void {
	Reflect.defineMetadata(CONTROLLER_KEY, metadata, target);
}

export function getControllerMetadata(target: object): ControllerMetadata | undefined {
	return Reflect.getMetadata(CONTROLLER_KEY, target) as ControllerMetadata | undefined;
}

export function addHttpMethod(target: object, metadata: HttpMethodMetadata): void {
	const existing = getHttpMethods(target);
	existing.push(metadata);
	Reflect.defineMetadata(HTTP_METHODS_KEY, existing, target);
}

export function getHttpMethods(target: object): HttpMethodMetadata[] {
	return (Reflect.getMetadata(HTTP_METHODS_KEY, target) as HttpMethodMetadata[] | undefined) ?? [];
}

export function addCallable(target: object, metadata: CallableMetadata): void {
	const existing = getCallables(target);
	existing.push(metadata);
	Reflect.defineMetadata(CALLABLES_KEY, existing, target);
}

export function getCallables(target: object): CallableMetadata[] {
	return (Reflect.getMetadata(CALLABLES_KEY, target) as CallableMetadata[] | undefined) ?? [];
}

export function getClassMetadata(target: object): ClassMetadata {
	const controller = getControllerMetadata(target);
	if (!controller) {
		throw new Error('Class is not decorated with @Controller');
	}
	return {
		controller,
		httpMethods: getHttpMethods(target),
		callables: getCallables(target),
	};
}
