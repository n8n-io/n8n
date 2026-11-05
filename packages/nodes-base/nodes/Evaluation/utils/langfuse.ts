import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
} from 'n8n-workflow';
import { assertCredentialAllowsUrl, NodeOperationError } from 'n8n-workflow';

export const LANGFUSE_PAGE_SIZE = 50;

export const LANGFUSE_RESERVED_ROW_KEYS = [
	'input',
	'metadata',
	'row_number',
	'_rowsLeft',
	'_langfuse',
];

const UNSAFE_ROW_KEYS = ['__proto__', 'constructor', 'prototype'];

const MAX_SCAN_PAGES = 500;

export interface LangfusePageMeta {
	page: number;
	limit: number;
	totalItems: number;
	totalPages: number;
}

export interface LangfusePage<T> {
	data: T[];
	meta: LangfusePageMeta;
}

export interface LangfuseDataset {
	id: string;
	name: string;
	description?: string | null;
	metadata?: unknown;
	projectId?: string;
}

export interface LangfuseDatasetItem {
	id: string;
	datasetId?: string;
	datasetName?: string;
	input?: unknown;
	expectedOutput?: unknown;
	metadata?: unknown;
	status?: 'ACTIVE' | 'ARCHIVED';
	sourceTraceId?: string | null;
	sourceObservationId?: string | null;
}

export interface LangfuseTriggerOptions {
	flattenInput?: boolean;
	expectedOutputField?: string;
	includeMetadata?: boolean;
}

export interface LangfuseRowOptions {
	flattenInput: boolean;
	expectedOutputField: string;
	includeMetadata: boolean;
}

export interface LangfuseRowState {
	position?: number;
	fetchedAt?: string;
	datasetId?: string;
	datasetName?: string;
}

type LangfuseContext = IExecuteFunctions | ILoadOptionsFunctions;

function scanLimitError(context: LangfuseContext) {
	return new NodeOperationError(
		context.getNode(),
		`Langfuse dataset scan stopped after ${MAX_SCAN_PAGES} pages before reaching the end of the dataset`,
		{ description: 'Pin a more recent dataset version or archive fewer items in the dataset' },
	);
}

export async function langfuseApiRequest(
	this: LangfuseContext,
	method: IHttpRequestMethods,
	path: string,
	qs: IDataObject = {},
	body?: IDataObject,
) {
	const credentials = await this.getCredentials<ICredentialDataDecryptedObject & { host: string }>(
		'langfuseApi',
	);
	const host = credentials.host.replace(/\/+$/, '');

	assertCredentialAllowsUrl({
		node: this.getNode(),
		credentialData: credentials,
		url: host,
		surface: 'Evaluation Trigger',
	});

	const options: IHttpRequestOptions = {
		method,
		url: `${host}/api/public${path}`,
		qs,
		json: true,
		disableFollowRedirect: true,
	};

	if (body !== undefined) options.body = body;

	return await this.helpers.httpRequestWithAuthentication.call(this, 'langfuseApi', options);
}

export async function getLangfuseDataset(this: LangfuseContext, name: string) {
	return (await langfuseApiRequest.call(
		this,
		'GET',
		`/v2/datasets/${encodeURIComponent(name)}`,
	)) as LangfuseDataset;
}

export async function getLangfuseDatasetItemsPage(
	this: LangfuseContext,
	params: { datasetName: string; version?: string; page: number; limit: number },
) {
	const qs: IDataObject = {
		datasetName: params.datasetName,
		page: params.page,
		limit: params.limit,
	};

	if (params.version) qs.version = params.version;

	return (await langfuseApiRequest.call(
		this,
		'GET',
		'/dataset-items',
		qs,
	)) as LangfusePage<LangfuseDatasetItem>;
}

export async function getAllLangfuseDatasetItems(
	this: LangfuseContext,
	params: { datasetName: string; version?: string; maxItems: number },
) {
	const items: LangfuseDatasetItem[] = [];
	let page = 1;

	while (items.length < params.maxItems) {
		if (page > MAX_SCAN_PAGES) throw scanLimitError(this);

		const response = await getLangfuseDatasetItemsPage.call(this, {
			datasetName: params.datasetName,
			version: params.version,
			page,
			limit: LANGFUSE_PAGE_SIZE,
		});

		if (!response.data?.length) break;

		for (const item of response.data) {
			if (item.status !== 'ARCHIVED') items.push(item);
		}

		if (page >= (response.meta?.totalPages ?? page)) break;
		page++;
	}

	return items.slice(0, params.maxItems);
}

export async function findLangfuseActiveItem(
	this: LangfuseContext,
	params: { datasetName: string; version?: string; start: number },
) {
	const { datasetName, version } = params;

	const probe = await getLangfuseDatasetItemsPage.call(this, {
		datasetName,
		version,
		page: params.start + 1,
		limit: 1,
	});

	if (!probe.data?.length) return null;

	const totalItems = probe.meta?.totalItems;

	if (probe.data[0].status !== 'ARCHIVED') {
		return { item: probe.data[0], position: params.start, totalItems };
	}

	let offset = params.start + 1;

	for (let scanned = 0; scanned < MAX_SCAN_PAGES; scanned++) {
		const page = Math.floor(offset / LANGFUSE_PAGE_SIZE) + 1;
		const response = await getLangfuseDatasetItemsPage.call(this, {
			datasetName,
			version,
			page,
			limit: LANGFUSE_PAGE_SIZE,
		});

		if (!response.data?.length) return null;

		const pageStart = (page - 1) * LANGFUSE_PAGE_SIZE;

		for (let i = offset - pageStart; i < response.data.length; i++) {
			if (response.data[i].status !== 'ARCHIVED') {
				return { item: response.data[i], position: pageStart + i, totalItems };
			}
		}

		offset = page * LANGFUSE_PAGE_SIZE;
		if (typeof totalItems === 'number' && offset >= totalItems) return null;
		if (typeof response.meta?.totalPages === 'number' && page >= response.meta.totalPages) {
			return null;
		}
	}

	throw scanLimitError(this);
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

function hasValidCalendarDate(value: string) {
	const [year, month, day] = value.slice(0, 10).split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

export function parseLangfuseDatasetVersion(node: INode, value: unknown): string | null {
	if (typeof value !== 'string' || value.trim() === '') return null;

	const trimmed = value.trim();
	const date = new Date(trimmed);

	if (
		!ISO_TIMESTAMP.test(trimmed) ||
		Number.isNaN(date.getTime()) ||
		!hasValidCalendarDate(trimmed)
	) {
		throw new NodeOperationError(node, `Invalid dataset version "${trimmed}"`, {
			description: 'Use an ISO 8601 UTC timestamp, for example 2026-01-21T14:35:42Z',
		});
	}

	return date.toISOString();
}

export function parseLangfuseOptions(
	node: INode,
	options: LangfuseTriggerOptions,
): LangfuseRowOptions {
	const rawField = options.expectedOutputField ?? 'expectedOutput';
	const expectedOutputField = typeof rawField === 'string' ? rawField.trim() : '';

	if (
		expectedOutputField === '' ||
		LANGFUSE_RESERVED_ROW_KEYS.includes(expectedOutputField) ||
		UNSAFE_ROW_KEYS.includes(expectedOutputField)
	) {
		throw new NodeOperationError(
			node,
			`Invalid expected output field "${typeof rawField === 'string' ? rawField : ''}"`,
			{
				description: `Use a non-empty name other than ${LANGFUSE_RESERVED_ROW_KEYS.join(', ')}`,
			},
		);
	}

	return {
		flattenInput: options.flattenInput ?? true,
		includeMetadata: options.includeMetadata ?? true,
		expectedOutputField,
	};
}

export function buildLangfuseRow(params: {
	item: LangfuseDatasetItem;
	dataset: Pick<LangfuseDataset, 'id' | 'name'>;
	rowNumber: number;
	datasetVersion: string | null;
	fetchedAt: string;
	options: LangfuseRowOptions;
	position?: number;
}): IDataObject {
	const { item, dataset, rowNumber, datasetVersion, fetchedAt, options, position } = params;

	const { flattenInput, includeMetadata, expectedOutputField } = options;

	const reserved = new Set([
		...LANGFUSE_RESERVED_ROW_KEYS,
		...UNSAFE_ROW_KEYS,
		expectedOutputField,
	]);

	const row: IDataObject = {};

	if (flattenInput && item.input !== null && typeof item.input === 'object') {
		if (!Array.isArray(item.input)) {
			for (const [key, value] of Object.entries(item.input)) {
				if (!reserved.has(key)) row[key] = value as IDataObject[string];
			}
		}
	}

	row.input = item.input as IDataObject[string];
	row[expectedOutputField] = item.expectedOutput as IDataObject[string];

	if (includeMetadata) row.metadata = item.metadata as IDataObject[string];

	row.row_number = rowNumber;
	row._langfuse = {
		datasetId: dataset.id,
		datasetName: dataset.name,
		itemId: item.id,
		datasetVersion,
		fetchedAt,
		expectedOutput: item.expectedOutput ?? null,
		...(position === undefined ? {} : { position }),
	} as IDataObject;

	return row;
}
