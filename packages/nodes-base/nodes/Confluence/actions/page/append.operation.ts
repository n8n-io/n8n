import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';

import { bodyProperties, readBodyEnvelope } from './bodyEnvelope';
import { fetchPageForWrite, putPage } from './pageWrite';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const showOnAppend = { resource: ['page'], operation: ['append'] };

export const description: INodeProperties[] = [
	{
		...optionalSpaceRLC,
		displayOptions: { show: showOnAppend },
	},
	{
		...pageRLC,
		description: 'The page to append the content to',
		displayOptions: { show: showOnAppend },
	},
	...bodyProperties(['append']),
];

export function mergeAdfDocuments(currentValue: string, additionDoc: IDataObject): string {
	// Pages saved without ADF content can come back with an empty body value
	if (currentValue.trim() === '') return JSON.stringify(additionDoc);

	let current: unknown;
	try {
		current = JSON.parse(currentValue);
	} catch {
		current = null;
	}
	if (current === null || typeof current !== 'object' || Array.isArray(current)) {
		throw new Error('The current body of the page could not be read as an ADF document');
	}

	const currentDoc = current as IDataObject;
	const currentContent = Array.isArray(currentDoc.content) ? currentDoc.content : [];
	return JSON.stringify({
		...currentDoc,
		content: [...currentContent, ...(additionDoc.content as unknown[])],
	});
}

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	// Validated before any API call (a By Title page lookup is one already)
	const addition = readBodyEnvelope(this, itemIndex);
	const additionDoc =
		addition.representation === 'atlas_doc_format'
			? jsonParse<IDataObject>(addition.value)
			: undefined;

	const pageId = await resolvePageId.call(this, itemIndex);

	// The page is fetched in the input's representation; formats are never mixed
	const page = await fetchPageForWrite.call(this, itemIndex, pageId, addition.representation);

	let value: string;
	if (additionDoc === undefined) {
		value = page.bodyValue + addition.value;
	} else {
		try {
			value = mergeAdfDocuments(page.bodyValue, additionDoc);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex });
		}
	}

	return await putPage.call(this, itemIndex, pageId, page, page.title, {
		representation: addition.representation,
		value,
	});
};
