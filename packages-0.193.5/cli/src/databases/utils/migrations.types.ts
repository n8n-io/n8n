import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

export namespace PinData {
	export type Old = { [nodeName: string]: IDataObject[] };

	export type New = { [nodeName: string]: INodeExecutionData[] };

	export type FetchedWorkflow = { id: number; pinData: string | Old };
}

export function isObjectLiteral(maybeObject: unknown): maybeObject is { [key: string]: string } {
	return typeof maybeObject === 'object' && maybeObject !== null && !Array.isArray(maybeObject);
}

export function isJsonKeyObject(item: unknown): item is {
	json: unknown;
	[otherKeys: string]: unknown;
} {
	if (!isObjectLiteral(item)) return false;

	return Object.keys(item).includes('json');
}
