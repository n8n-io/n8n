import { createComponentRenderer } from '@/__tests__/render';
import CredentialIcon from '@/components/CredentialIcon.vue';
import { STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import * as testNodeTypes from './testData/nodeTypesTestData';
import merge from 'lodash-es/merge';
import { groupNodeTypesByNameAndType } from '@/utils/nodeTypes/nodeTypeTransforms';

const defaultState = {
	[STORES.CREDENTIALS]: {},
	[STORES.NODE_TYPES]: {},
};

const renderComponent = createComponentRenderer(CredentialIcon, {
	pinia: createTestingPinia({
		initialState: defaultState,
	}),
	global: {
		stubs: ['n8n-tooltip'],
	},
});

describe('CredentialIcon', () => {
	const findIcon = (baseElement: Element) => baseElement.querySelector('img');

	it('shows correct icon for credential type that is for the latest node type version', () => {
		const { baseElement } = renderComponent({
			pinia: createTestingPinia({
				initialState: merge(defaultState, {
					[STORES.CREDENTIALS]: {},
					[STORES.NODE_TYPES]: {
						nodeTypes: groupNodeTypesByNameAndType([
							testNodeTypes.twitterV1,
							testNodeTypes.twitterV2,
						]),
					},
				}),
			}),
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
			pinia: createTestingPinia({
				initialState: merge(defaultState, {
					[STORES.CREDENTIALS]: {},
					[STORES.NODE_TYPES]: {
						nodeTypes: groupNodeTypesByNameAndType([
							testNodeTypes.twitterV1,
							testNodeTypes.twitterV2,
						]),
					},
				}),
			}),
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
