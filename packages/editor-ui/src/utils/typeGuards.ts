import {INodeParameterResourceLocator} from "n8n-workflow";
import {ICredentialsResponse} from "@/Interface";

/*
	Type guards used in editor-ui project
*/

export const checkExhaustive = (value: never): never => {
	throw new Error(`Unhandled value: ${value}`);
};

export function isResourceLocatorValue(value: unknown): value is INodeParameterResourceLocator {
	return Boolean(typeof value === 'object' && value && 'mode' in value && 'value' in value);
}

export function isNotNull<T>(value: T | null): value is T {
	return value !== null;
}

export function isValidCredentialResponse(value: unknown): value is ICredentialsResponse {
	return typeof value === 'object' && value !== null && 'id' in value;
}

export const isObj = (obj: unknown): obj is object => !!obj && Object.getPrototypeOf(obj) === Object.prototype;

export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number';
}
