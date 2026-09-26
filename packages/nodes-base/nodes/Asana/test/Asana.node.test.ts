import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { asanaApiResponse, asanaNodeResponse } from './mocks';

describe('Asana Node', () => {
	const testHarness = new NodeTestHarness();
	const baseUrl = 'https://app.asana.com/api/1.0';
	const credentials = {
		asanaApi: {},
		asanaOAuth2Api: {},
	};

	describe('Task Comment Operations', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should get a comment by ID',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'taskComment',
									operation: 'get',
									id: '1234567890123456',
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [[asanaNodeResponse.getComment]],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/stories/1234567890123456',
							statusCode: 200,
							responseBody: asanaApiResponse.getComment,
						},
					],
				},
			},
			{
				description: 'should get all comments for a task',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'taskComment',
									operation: 'getAll',
									taskId: '9876543210987654',
									returnAll: true,
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [asanaNodeResponse.getAllComments],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/tasks/9876543210987654/stories?limit=100',
							statusCode: 200,
							responseBody: asanaApiResponse.getAllComments,
						},
					],
				},
			},
			{
				description: 'should get limited comments for a task',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'taskComment',
									operation: 'getAll',
									taskId: '9876543210987654',
									returnAll: false,
									limit: 2,
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [asanaNodeResponse.getLimitedComments],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/tasks/9876543210987654/stories?limit=2',
							statusCode: 200,
							responseBody: asanaApiResponse.getLimitedComments,
						},
					],
				},
			},
		];

		for (const testData of tests) {
			testHarness.setupTest(testData, { credentials });
		}
	});

	describe('Attachment Operations', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should get an attachment by ID',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'attachment',
									operation: 'get',
									id: '5555555555555555',
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [[asanaNodeResponse.getAttachment]],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/attachments/5555555555555555',
							statusCode: 200,
							responseBody: asanaApiResponse.getAttachment,
						},
					],
				},
			},
			{
				description: 'should get all attachments for a task',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'attachment',
									operation: 'getAll',
									taskId: '9876543210987654',
									returnAll: true,
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [asanaNodeResponse.getAllAttachments],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/tasks/9876543210987654/attachments?limit=100',
							statusCode: 200,
							responseBody: asanaApiResponse.getAllAttachments,
						},
					],
				},
			},
			{
				description: 'should get limited attachments for a task',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'attachment',
									operation: 'getAll',
									taskId: '9876543210987654',
									returnAll: false,
									limit: 1,
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [asanaNodeResponse.getLimitedAttachments],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/tasks/9876543210987654/attachments?limit=1',
							statusCode: 200,
							responseBody: asanaApiResponse.getLimitedAttachments,
						},
					],
				},
			},
		];

		for (const testData of tests) {
			testHarness.setupTest(testData, { credentials });
		}
	});

	describe('Error Handling', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should handle error when comment not found',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'taskComment',
									operation: 'get',
									id: 'invalid-comment-id',
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [],
					},
					error: 'The resource you are requesting could not be found',
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/stories/invalid-comment-id',
							statusCode: 404,
							responseBody: {
								errors: [
									{
										message: 'Not Found',
									},
								],
							},
						},
					],
				},
			},
			{
				description: 'should handle error when attachment not found',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'attachment',
									operation: 'get',
									id: 'invalid-attachment-id',
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Asana',
								type: 'n8n-nodes-base.asana',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									asanaApi: {
										id: '1',
										name: 'Asana account',
									},
								},
							},
						],
						connections: {
							'When clicking "Execute workflow"': {
								main: [
									[
										{
											node: 'Asana',
											type: NodeConnectionTypes.Main,
											index: 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Asana: [],
					},
					error: 'The resource you are requesting could not be found',
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/attachments/invalid-attachment-id',
							statusCode: 404,
							responseBody: {
								errors: [
									{
										message: 'Not Found',
									},
								],
							},
						},
					],
				},
			},
		];

		for (const testData of tests) {
			testHarness.setupTest(testData, { credentials });
		}
	});
});
