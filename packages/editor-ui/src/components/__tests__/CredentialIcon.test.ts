import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import CredentialIcon from '@/components/CredentialIcon.vue';
import { STORES } from '@/constants';
import { groupNodeTypesByNameAndType } from '@/utils/nodeTypes/nodeTypeTransforms';

import { createComponentRenderer } from '@/__tests__/render';

const twitterV1 = mock<INodeTypeDescription>({
	version: 1,
	credentials: [{ name: 'twitterOAuth1Api', required: true }],
	iconUrl: 'icons/n8n-nodes-base/dist/nodes/Twitter/x.svg',
});

const twitterV2 = mock<INodeTypeDescription>({
	version: 2,
	credentials: [{ name: 'twitterOAuth2Api', required: true }],
	iconUrl: 'icons/n8n-nodes-base/dist/nodes/Twitter/x.svg',
});

const nodeTypes = groupNodeTypesByNameAndType([twitterV1, twitterV2]);
const initialState = {
	[STORES.CREDENTIALS]: {},
	[STORES.NODE_TYPES]: { nodeTypes },
};

const renderComponent = createComponentRenderer(CredentialIcon, {
	pinia: createTestingPinia({ initialState }),
	global: {
		stubs: ['n8n-tooltip'],
	},
});

describe('CredentialIcon', () => {
	const findIcon = (baseElement: Element) => baseElement.querySelector('img');

	it('shows correct icon for credential type that is for the latest node type version', () => {
		const { baseElement } = renderComponent({
			pinia: createTestingPinia({ initialState }),
			props: {
				credentialTypeName: 'twitterOAuth2Api',
			},
		});

		expect(findIcon(baseElement)).toHaveAttribute(
			'src',
			'/icons/n8n-nodes-base/dist/nodes/Twitter/x.svg',
		);
	});

	it('shows correct icon for credential type that is for an older node type version', () => {
		const { baseElement } = renderComponent({
			pinia: createTestingPinia({ initialState }),
			props: {
				credentialTypeName: 'twitterOAuth1Api',
			},
		});

		expect(findIcon(baseElement)).toHaveAttribute(
			'src',
			'/icons/n8n-nodes-base/dist/nodes/Twitter/x.svg',
		);
	});
});
