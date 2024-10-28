import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { useActionsGenerator } from '../composables/useActionsGeneration';

describe('useActionsGenerator', () => {
	const { generateMergedNodesAndActions } = useActionsGenerator();
	const NODE_NAME = 'n8n-nodes-base.test';
	const baseV2NodeWoProps: INodeTypeDescription = {
		name: NODE_NAME,
		displayName: 'Test',
		description: 'Test Node',
		defaultVersion: 2,
		version: 2,
		group: ['output'],
		defaults: {
			name: 'Test',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	describe('App actions for resource category', () => {
		const resourcePropertyWithUser: INodeProperties = {
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'User',
					value: 'user',
				},
			],
			default: 'user',
		};
		const resourcePropertyWithUserAndPage: INodeProperties = {
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'User',
					value: 'user',
				},
				{
					name: 'Page',
					value: 'page',
				},
			],
			default: 'user',
		};

		it('returns single action for single resource & single operation without resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns single action for single resource & single operation with matching resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns nothing for multiple resources & single operation without resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUserAndPage,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [],
			});
		});

		it('returns single action for multiple resources & single operation with resource filter', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUserAndPage,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns multiple actions for multiple resources & multiple operations with resource filters', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUserAndPage,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
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
								name: 'Get',
								value: 'get',
								description: 'Get description',
							},
						],
						default: 'get',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'User Get',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
					expect.objectContaining({
						actionKey: 'get',
						description: 'Get description',
						displayName: 'Page Get',
						codex: {
							label: 'Page Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns correct action for single resource & multiple operations with different versions', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								// eslint-disable-next-line @typescript-eslint/naming-convention
								'@version': [1],
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get Version 1',
								value: 'getv1',
								description: 'Get version 1',
							},
						],
						default: 'getv1',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								// eslint-disable-next-line @typescript-eslint/naming-convention
								'@version': [2],
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get Version 2',
								value: 'getv2',
								description: 'Get version 2',
							},
						],
						default: 'getv2',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'getv2',
						description: 'Get version 2',
						displayName: 'User Get Version 2',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});

		it('returns correct action for single resource & single operation with multiple versions', () => {
			const node: INodeTypeDescription = {
				...baseV2NodeWoProps,
				properties: [
					resourcePropertyWithUser,
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								// eslint-disable-next-line @typescript-eslint/naming-convention
								'@version': [1, 2],
								resource: ['user'],
							},
						},
						options: [
							{
								name: 'Get Version 2',
								value: 'getv2',
								description: 'Get version 2',
							},
						],
						default: 'getv2',
					},
				],
			};

			const { actions } = generateMergedNodesAndActions([node], []);
			expect(actions).toEqual({
				[NODE_NAME]: [
					expect.objectContaining({
						actionKey: 'getv2',
						description: 'Get version 2',
						displayName: 'User Get Version 2',
						codex: {
							label: 'User Actions',
							categories: ['Actions'],
						},
					}),
				],
			});
		});
	});
});
