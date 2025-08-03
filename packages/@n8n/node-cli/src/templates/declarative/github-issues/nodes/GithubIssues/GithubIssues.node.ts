import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { issueDescription } from './resources/issue';
import { issueCommentDescription } from './resources/issueComment';
import { getRepositories } from './listSearch/getRepositories';
import { getUsers } from './listSearch/getUsers';
import { getIssues } from './listSearch/getIssues';

export class GithubIssues implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Github Issues',
		name: 'githubIssues',
		icon: { light: 'file:github.svg', dark: 'file:github.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume issues from the Github API',
		defaults: {
			name: 'Github Issues',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'githubIssuesApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'githubIssuesOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		requestDefaults: {
			baseURL: 'https://api.github.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Issue Comment',
						value: 'issueComment',
					},
				],
				default: 'issue',
			},
			...issueDescription,
			...issueCommentDescription,
		],
	};

	methods = {
		listSearch: {
			getRepositories,
			getUsers,
			getIssues,
		},
	};
}
