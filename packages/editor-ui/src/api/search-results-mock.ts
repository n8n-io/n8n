import { ISearchResults } from '@/Interface';

const searchResults = {
	categories: [
		{
			id: '1',
			name: 'first',
		},
		{
			id: '2',
			name: 'second',
		},
		{
			id: '3',
			name: 'third',
		},
		{
			id: '4',
			name: 'fourth',
		},
		{
			id: '5',
			name: 'fifth',
		},
		{
			id: '6',
			name: 'sixth',
		},
		{
			id: '7',
			name: 'seventh',
		},
		{
			id: '8',
			name: 'eighth',
		},
	],
	collections: [
		{
			id: '1',
			name: 'First',
			workflowsCount: 6,
			nodes: [
				{
					displayName: "Merge",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge3",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Concatenate SemesterIDs",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
			],
		},
		{
			id: '2',
			name: 'Second',
			workflowsCount: 6,
			nodes: [
				{
					displayName: "Merge",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge3",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Concatenate SemesterIDs",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
			],
		},
		{
			id: '3',
			name: 'Third',
			workflowsCount: 6,
			nodes: [
				{
					displayName: "Merge",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge3",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Concatenate SemesterIDs",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
			],
		},
		{
			id: '4',
			name: 'Forth',
			workflowsCount: 6,
			nodes: [
				{
					displayName: "Merge",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge3",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Concatenate SemesterIDs",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
			],
		},
		{
			id: '5',
			name: 'Fifth',
			workflowsCount: 6,
			nodes: [
				{
					displayName: "Merge",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge3",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Concatenate SemesterIDs",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
			],
		},
	],
	totalWorkflows: 2,
	workflows: [
		{
			id: "1375",
			name: "GitLab Release -> Outline document",
			description: "Create a document in Outline for each new GitLab release.\n\nDepends on [this PR](https://github.com/n8n-io/n8n/pull/2591) being merged.\n\n1. Copy workflow\n2. Set credentials for GitLab and Outline\n3. Inside HTTP Request node, set the following:\n   - `collectionId`\n   - `parentDocumentId` (or remove if unwanted)\n\n[Example result](https://onezoomin.getoutline.com/share/f4fb81fc-af09-442c-9bdd-6365aeb70058/doc/gitlab-releases-test-ffbapVHbBt)\n",
			nodes: [
				{
					displayName: "Gitlab Trigger",
					name: "n8n-nodes-base.gitlabTrigger",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "HTTP Request",
					name: "n8n-nodes-base.httpRequest",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "IF",
					name: "n8n-nodes-base.if",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
			],

			createdAt: "2021-12-22T21:52:11.277Z",
			totalViews: 300,
			user: {
				username: "tennox",
			},
		},
		{
			id: "1374",
			name: "Team/Project Creation using a Webhook and Notion",
			description: "Creates a new team for a project from webhook form data. When the project is created the current semester is added to it's relation attribute.\n\n![image.png](fileId:577)\nMore info can be found on using this workflow as part of a larger system [here](here).\n",
			nodes: [
				{
					displayName: "Get Team Members",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query Current Semester",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Select Semester ID and Projects Count",
					name: "n8n-nodes-base.set",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Use Default Name if Not Specified",
					name: "n8n-nodes-base.set",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Select Project Showcase ID",
					name: "n8n-nodes-base.set",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Get Project Name & Idea",
					name: "n8n-nodes-base.set",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Create Project",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "If user exists",
					name: "n8n-nodes-base.if",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Create User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query for User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge1",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge2",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Update Semester for User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Query User",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Select Semester ID",
					name: "n8n-nodes-base.set",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Update Project Relation",
					name: "n8n-nodes-base.notion",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge3",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Concatenate SemesterIDs",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Concatenate ProjectIDs",
					name: "n8n-nodes-base.function",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Merge4",
					name: "n8n-nodes-base.merge",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Set Email",
					name: "n8n-nodes-base.set",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
				{
					displayName: "Team Creation",
					name: "n8n-nodes-base.webhook",
					icon: 'path',
					defaults: {
						color: 'white',
					},
				},
			],
			totalViews: 3000,
			createdAt: "2021-12-22T21:52:06.307Z",
			user: {
				username: "automations",
			},
		},
	],
};

// export async function getSearchResults(): Promise<ISearchResults> {
// 	return searchResults;
// }
