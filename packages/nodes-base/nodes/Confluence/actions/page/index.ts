import type { INodeProperties } from 'n8n-workflow';

import * as addComment from './addComment.operation';
import * as addLabels from './addLabels.operation';
import * as append from './append.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as deleteComment from './deleteComment.operation';
import * as get from './get.operation';
import * as getComments from './getComments.operation';
import * as getLabels from './getLabels.operation';
import * as getManyByLabel from './getManyByLabel.operation';
import * as removeLabel from './removeLabel.operation';
import * as update from './update.operation';

export {
	addComment,
	addLabels,
	append,
	create,
	del as delete,
	deleteComment,
	get,
	getComments,
	getLabels,
	getManyByLabel,
	removeLabel,
	update,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['page'],
			},
		},
		options: [
			{
				name: 'Add Comment',
				value: 'addComment',
				description: 'Add a footer comment to a page, or reply to an existing comment',
				action: 'Add a comment to a page',
			},
			{
				name: 'Add Labels',
				value: 'addLabels',
				description: 'Add one or more labels to a page',
				action: 'Add labels to a page',
			},
			{
				name: 'Append',
				value: 'append',
				description: 'Append content to the bottom of an existing page',
				action: 'Append content to a page',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new page in a space',
				action: 'Create a page',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Move a page to trash, or permanently delete it',
				action: 'Delete a page',
			},
			{
				name: 'Delete Comment',
				value: 'deleteComment',
				description: 'Permanently delete a footer comment by ID',
				action: 'Delete a comment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a page, optionally with its full sub-tree',
				action: 'Get a page',
			},
			{
				name: 'Get Comments',
				value: 'getComments',
				description: 'List the footer comments on a page, one item per comment',
				action: 'Get comments on a page',
			},
			{
				name: 'Get Labels',
				value: 'getLabels',
				description: 'List the labels on a page',
				action: 'Get page labels',
			},
			{
				name: 'Get Many by Label',
				value: 'getManyByLabel',
				description: 'Retrieve all pages carrying a label',
				action: 'Get many pages by label',
			},
			{
				name: 'Remove Label',
				value: 'removeLabel',
				description: 'Remove a label from a page by name',
				action: 'Remove a label from a page',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Replace the title and body of an existing page',
				action: 'Update a page',
			},
		],
		default: 'create',
	},
	...addComment.description,
	...addLabels.description,
	...append.description,
	...create.description,
	...del.description,
	...deleteComment.description,
	...get.description,
	...getComments.description,
	...getLabels.description,
	...getManyByLabel.description,
	...removeLabel.description,
	...update.description,
];
