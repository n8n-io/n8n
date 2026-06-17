import { mock } from 'vitest-mock-extended';
import type { IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import type { INodeParameters } from 'n8n-workflow';
import {
	clearAllNodeResourceLocatorValues,
	clearResourceLocatorValues,
	keyFromCredentialTypeAndName,
	replaceAllTemplateNodeCredentials,
} from './templateTransforms';

describe('templateTransforms', () => {
	describe('replaceAllTemplateNodeCredentials', () => {
		it('should replace credentials of nodes that have credentials', () => {
			const nodeTypeProvider = {
				getNodeType: vitest.fn(),
			};
			const node = mock<IWorkflowTemplateNode>({
				id: 'twitter',
				type: 'n8n-nodes-base.twitter',
				credentials: {
					twitterOAuth1Api: 'old1',
				},
			});

			const toReplaceWith = {
				[keyFromCredentialTypeAndName('twitterOAuth1Api', 'old1')]: {
					id: 'new1',
					name: 'Twitter creds',
				},
			};

			const [replacedNode] = replaceAllTemplateNodeCredentials(
				nodeTypeProvider,
				[node],
				toReplaceWith,
			);

			expect(replacedNode.credentials).toEqual({
				twitterOAuth1Api: { id: 'new1', name: 'Twitter creds' },
			});
		});

		it('should not replace credentials of nodes that do not have credentials', () => {
			const nodeTypeProvider = {
				getNodeType: vitest.fn(),
			};
			const node = mock<IWorkflowTemplateNode>({
				id: 'twitter',
				type: 'n8n-nodes-base.twitter',
			});
			const toReplaceWith = {
				[keyFromCredentialTypeAndName('twitterOAuth1Api', 'old1')]: {
					id: 'new1',
					name: 'Twitter creds',
				},
			};

			const [replacedNode] = replaceAllTemplateNodeCredentials(
				nodeTypeProvider,
				[node],
				toReplaceWith,
			);

			expect(replacedNode.credentials).toBeUndefined();
		});
	});

	describe('clearResourceLocatorValues', () => {
		it('should clear resourceLocator values while preserving mode', () => {
			const parameters: INodeParameters = {
				channel: { __rl: true, mode: 'list', value: 'C123456' },
				text: 'Hello world',
			};

			const result = clearResourceLocatorValues(parameters);

			expect(result).toEqual({
				channel: { __rl: true, mode: 'list', value: '' },
				text: 'Hello world',
			});
		});

		it('should clear multiple resourceLocator values', () => {
			const parameters: INodeParameters = {
				channel: { __rl: true, mode: 'list', value: 'C123456' },
				sheet: { __rl: true, mode: 'url', value: 'https://docs.google.com/spreadsheets/d/abc' },
				message: 'test',
			};

			const result = clearResourceLocatorValues(parameters);

			expect(result).toEqual({
				channel: { __rl: true, mode: 'list', value: '' },
				sheet: { __rl: true, mode: 'url', value: '' },
				message: 'test',
			});
		});

		it('should return parameters unchanged when no resourceLocator values exist', () => {
			const parameters: INodeParameters = {
				text: 'Hello',
				number: 42,
				flag: true,
			};

			const result = clearResourceLocatorValues(parameters);

			expect(result).toEqual(parameters);
		});

		it('should handle empty parameters', () => {
			const result = clearResourceLocatorValues({});
			expect(result).toEqual({});
		});
	});

	describe('clearAllNodeResourceLocatorValues', () => {
		it('should clear resourceLocator values across all nodes', () => {
			const nodes = [
				{
					name: 'Slack',
					parameters: {
						channel: { __rl: true, mode: 'list', value: 'C123' },
						text: 'Hello',
					} as INodeParameters,
				},
				{
					name: 'Google Sheets',
					parameters: {
						sheet: { __rl: true, mode: 'url', value: 'https://example.com' },
						range: 'A1:B2',
					} as INodeParameters,
				},
			];

			const result = clearAllNodeResourceLocatorValues(nodes);

			expect(result[0].parameters).toEqual({
				channel: { __rl: true, mode: 'list', value: '' },
				text: 'Hello',
			});
			expect(result[1].parameters).toEqual({
				sheet: { __rl: true, mode: 'url', value: '' },
				range: 'A1:B2',
			});
		});

		it('should not mutate original nodes', () => {
			const nodes = [
				{
					name: 'Slack',
					parameters: {
						channel: { __rl: true, mode: 'list', value: 'C123' },
					} as INodeParameters,
				},
			];

			clearAllNodeResourceLocatorValues(nodes);

			expect(nodes[0].parameters.channel).toEqual({
				__rl: true,
				mode: 'list',
				value: 'C123',
			});
		});
	});
});
