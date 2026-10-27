import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { confluenceApiRequest } from '../../transport';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const properties: INodeProperties[] = [
	optionalSpaceRLC,
	{
		...pageRLC,
		description: 'The page to add labels to',
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. runbook, q3-release',
		description:
			'The label names to add, comma-separated for several. Label names cannot contain spaces — use an underscore or hyphen instead. Existing labels are kept.',
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['addLabels'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	// `?? ''` guards an expression resolving to undefined, which would otherwise
	// stringify into a label literally named "undefined"
	const names = String(this.getNodeParameter('labels', itemIndex, '') ?? '')
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	if (names.length === 0) {
		throw new NodeOperationError(this.getNode(), "The 'Labels' parameter is empty", { itemIndex });
	}
	// Confluence splits a name on whitespace into several labels rather than rejecting it,
	// so "release notes" would silently create "release" and "notes"
	const spaced = names.find((name) => /\s/.test(name));
	if (spaced !== undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`The label "${spaced}" contains a space; use an underscore or hyphen instead`,
			{ itemIndex },
		);
	}

	const pageId = await resolvePageId.call(this, itemIndex);

	// v1 endpoint: v2's label surface is read-only. LabelCreate requires a prefix,
	// and 'global' is what the Confluence UI writes.
	return await confluenceApiRequest.call(
		this,
		'POST',
		`/wiki/rest/api/content/${encodeURIComponent(pageId)}/label`,
		names.map((name) => ({ prefix: 'global', name })),
	);
};
