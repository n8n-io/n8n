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
		description: 'The page to remove the label from',
	},
	{
		displayName: 'Label',
		name: 'labelName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. runbook',
		description: 'The name of a single label to remove',
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['removeLabel'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	// `?? ''` guards an expression resolving to undefined, which would otherwise
	// stringify into a request for a label literally named "undefined"
	const label = String(this.getNodeParameter('labelName', itemIndex, '') ?? '').trim();
	if (label === '') {
		throw new NodeOperationError(this.getNode(), "The 'Label' parameter is empty", { itemIndex });
	}
	// A comma-separated list would 204 as a no-op and report success — reject it here instead
	if (label.includes(',')) {
		throw new NodeOperationError(
			this.getNode(),
			"The 'Label' parameter accepts one label name; commas are not allowed",
			{ itemIndex },
		);
	}
	// A label can never hold a space, so this would 204 as a no-op and report success too
	if (/\s/.test(label)) {
		throw new NodeOperationError(
			this.getNode(),
			`The label "${label}" contains a space; Confluence labels use an underscore or hyphen instead`,
			{ itemIndex },
		);
	}

	const pageId = await resolvePageId.call(this, itemIndex);

	// The name goes in the query string, not the path: the path variant rejects "/" in the name.
	// No prefix: neither content-label DELETE variant declares one — the name alone identifies it.
	await confluenceApiRequest.call(
		this,
		'DELETE',
		`/wiki/rest/api/content/${encodeURIComponent(pageId)}/label`,
		{},
		{ name: label },
	);

	return { removed: true, pageId, label };
};
