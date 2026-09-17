import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, isSafeObjectProperty, setSafeObjectProperty } from 'n8n-workflow';

/** Reads a parameter as a string. An expression may hand back a number. */
export function getString(
	this: IExecuteFunctions,
	name: string,
	itemIndex: number,
	fallback = '',
): string {
	const value = this.getNodeParameter(name, itemIndex, fallback);
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return fallback;
}

/** Reads a parameter the API needs, and names the empty field in the error. */
export function requireString(
	this: IExecuteFunctions,
	name: string,
	itemIndex: number,
	label: string,
): string {
	const value = getString.call(this, name, itemIndex);
	if (value.trim() === '') {
		throw new NodeOperationError(this.getNode(), `${label} is required`, { itemIndex });
	}
	return value;
}

/** Reads a resourceLocator as the plain ID that the API path or query needs. */
export function requireResourceId(
	this: IExecuteFunctions,
	name: string,
	itemIndex: number,
	label: string,
): string {
	const value = this.getNodeParameter(name, itemIndex, '', { extractValue: true });
	const id = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
	if (id.trim() === '') {
		throw new NodeOperationError(this.getNode(), `${label} is required`, { itemIndex });
	}
	return id;
}

/** Reads a count parameter that an expression may hand back as a numeric string. */
export function getPositiveInt(
	this: IExecuteFunctions,
	raw: unknown,
	label: string,
	itemIndex: number,
): number {
	const value = Number(raw);
	if (!Number.isFinite(value) || value < 1) {
		throw new NodeOperationError(this.getNode(), `${label} must be a finite number of at least 1`, {
			itemIndex,
		});
	}
	return Math.floor(value);
}

/** Reads the limit of a Get Many operation, with Return All as `Infinity`. */
export function getLimit(this: IExecuteFunctions, itemIndex: number): number {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	if (returnAll) return Infinity;
	return getPositiveInt.call(
		this,
		this.getNodeParameter('limit', itemIndex, 100),
		'Limit',
		itemIndex,
	);
}

/**
 * Turns a `fixedCollection` of name-value pairs into the flat object the API
 * expects. The keys come from the workflow author, so they are written through
 * the safe-property helpers.
 */
export function toKeyValueRecord(collection: unknown, entryName: string): IDataObject | undefined {
	if (!isRecord(collection)) return undefined;

	const entries = collection[entryName];
	if (!Array.isArray(entries)) return undefined;

	const record: IDataObject = {};
	for (const entry of entries) {
		if (!isRecord(entry)) continue;
		const { name, value } = entry;
		if (typeof name !== 'string' || name === '' || !isSafeObjectProperty(name)) continue;
		setSafeObjectProperty(record, name, typeof value === 'string' ? value : '');
	}

	return Object.keys(record).length > 0 ? record : undefined;
}
