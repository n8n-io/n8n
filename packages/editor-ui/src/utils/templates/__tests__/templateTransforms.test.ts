import {
	keyFromCredentialTypeAndName,
	replaceAllTemplateNodeCredentials,
} from '@/utils/templates/templateTransforms';
import { newWorkflowTemplateNode } from '@/utils/testData/templateTestData';

describe('templateTransforms', () => {
	describe('replaceAllTemplateNodeCredentials', () => {
		it('should replace credentials of nodes that have credentials', () => {
			const node = newWorkflowTemplateNode({
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

			const [replacedNode] = replaceAllTemplateNodeCredentials([node], toReplaceWith);

			expect(replacedNode.credentials).toEqual({
				twitterOAuth1Api: { id: 'new1', name: 'Twitter creds' },
			});
		});

		it('should not replace credentials of nodes that do not have credentials', () => {
			const node = newWorkflowTemplateNode({
				type: 'n8n-nodes-base.twitter',
			});
			const toReplaceWith = {
				[keyFromCredentialTypeAndName('twitterOAuth1Api', 'old1')]: {
					id: 'new1',
					name: 'Twitter creds',
				},
			};

			const [replacedNode] = replaceAllTemplateNodeCredentials([node], toReplaceWith);

			expect(replacedNode.credentials).toBeUndefined();
		});
	});
});
