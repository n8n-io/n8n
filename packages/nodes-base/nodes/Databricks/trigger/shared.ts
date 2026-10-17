import { isRecord } from '@n8n/utils/is-record';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { IDataObject, INodeExecutionData, IPollFunctions } from 'n8n-workflow';

import { makePermissionErrorLegible } from '../actions/helpers';

export const OVERLAP_MS = 5 * 60 * 1000;

function isEventList<T extends string>(value: unknown, known: readonly T[]): value is T[] {
	return Array.isArray(value) && value.every((item) => known.some((event) => event === item));
}

function isPermissionDeniedError(error: unknown): error is NodeApiError {
	return (
		error instanceof NodeApiError &&
		isRecord(error.context.data) &&
		error.context.data.error_code === 'PERMISSION_DENIED'
	);
}

export function readEvents<T extends string>(
	context: IPollFunctions,
	known: readonly T[],
	label: string,
): T[] {
	const events = context.getNodeParameter('events');
	if (!isEventList(events, known)) {
		throw new NodeOperationError(context.getNode(), `Events must be a list of ${label} events`, {
			description: 'Choose the events in the Events field.',
		});
	}
	return events;
}

export async function withLegibleErrors<T>(
	request: () => Promise<T>,
	permissionHint?: string,
): Promise<T> {
	try {
		return await request();
	} catch (error) {
		makePermissionErrorLegible(error);
		if (permissionHint !== undefined && isPermissionDeniedError(error)) {
			error.description = permissionHint;
		}
		throw error;
	}
}

export function toIso(ms: number): string {
	return new Date(ms).toISOString();
}

export function withoutUndefined(record: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

export function toOutput(items: INodeExecutionData[]): INodeExecutionData[][] | null {
	return items.length > 0 ? [items] : null;
}
