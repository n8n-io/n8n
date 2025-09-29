import { NodeConnectionType, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { issueDescription } from './resources/issue';
import { issueCommentDescription } from './resources/issueComment';
import { getRepositories } from './listSearch/getRepositories';
import { getUsers } from './listSearch/getUsers';
import { getIssues } from './listSearch/getIssues';

export class GithubIssues implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitHub Issues',
		name: 'githubIssues',
		icon: { light: 'file:../../icons/github.svg', dark: 'file:../../icons/github.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume issues from the GitHub API',
		defaults: {
			name: 'GitHub Issues',
		},
		usableAsTool: true,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
