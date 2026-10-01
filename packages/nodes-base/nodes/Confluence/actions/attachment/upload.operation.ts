import FormData from 'form-data';
import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { confluenceApiRequestUpload } from '../../transport';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const showOnUpload = { resource: ['attachment'], operation: ['upload'] };

export const description: INodeProperties[] = [
	{
		...optionalSpaceRLC,
		description:
			'Limits page selection and By Title lookups to one space. Leave empty or pick "All Spaces" to search across all spaces.',
		displayOptions: { show: showOnUpload },
	},
	{
		...pageRLC,
		description: 'The page to attach the file to',
		displayOptions: { show: showOnUpload },
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g. data',
		description: 'The name of the input binary field containing the file to upload',
		hint: 'The file is loaded into memory in full before uploading, so very large files may be slow or use significant memory',
		displayOptions: { show: showOnUpload },
	},
	{
		displayName: 'Minor Edit',
		name: 'minorEdit',
		type: 'boolean',
		default: false,
		description: 'Whether to upload without notifying watchers of the page',
		displayOptions: { show: showOnUpload },
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		description: 'An optional comment to attach to this version of the file',
		displayOptions: { show: showOnUpload },
	},
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const pageId = await resolvePageId.call(this, itemIndex);
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data');
	const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	// Neither a plain cast nor a strict `=== true` compare is safe here: a plain
	// cast reads the string "false" as truthy, and a strict compare reads the
	// string "true" (also possible from an expression) as false. Check both.
	const rawMinorEdit = this.getNodeParameter('minorEdit', itemIndex, false);
	const minorEdit = rawMinorEdit === true || rawMinorEdit === 'true';
	const comment = String(this.getNodeParameter('comment', itemIndex, '')).trim();

	const formData = new FormData();
	formData.append('file', buffer, {
		contentType: binaryData.mimeType,
		filename: binaryData.fileName ?? 'file',
	});
	formData.append('minorEdit', String(minorEdit));
	if (comment !== '') formData.append('comment', comment);

	const endpoint = `/wiki/rest/api/content/${encodeURIComponent(pageId)}/child/attachment`;
	const response = await confluenceApiRequestUpload.call(this, endpoint, formData);
	const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
	return results[0] ?? response;
};
