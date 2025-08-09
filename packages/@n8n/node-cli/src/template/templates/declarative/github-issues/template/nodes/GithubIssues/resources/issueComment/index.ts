import type { INodeProperties } from 'n8n-workflow';
import { repoNameSelect, repoOwnerSelect } from '../../shared/descriptions';
import { issueCommentGetManyDescription } from './getAll';

const showOnlyForIssueComments = {
	resource: ['issueComment'],
};

export const issueCommentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForIssueComments,
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get issue comments',
				description: 'Get issue comments',
				routing: {
					request: {
						method: 'GET',
						url: '=/repos/{{$parameter.owner}}/{{$parameter.repository}}/issues/comments',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		...repoOwnerSelect,
		displayOptions: {
			show: showOnlyForIssueComments,
		},
	},
	{
		...repoNameSelect,
		displayOptions: {
			show: showOnlyForIssueComments,
		},
	},
	...issueCommentGetManyDescription,
];
