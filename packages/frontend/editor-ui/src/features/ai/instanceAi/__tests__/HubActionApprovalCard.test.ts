import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { HubActionExecutionPayload } from '@n8n/api-types';
import HubActionApprovalCard from '../components/HubActionApprovalCard.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		template: '<span data-test-id="node-icon" />',
		props: ['nodeType', 'size', 'nodeName'],
	},
}));

const renderComponent = createComponentRenderer(HubActionApprovalCard);

function makePayload(
	overrides: Partial<HubActionExecutionPayload> = {},
): HubActionExecutionPayload {
	return {
		actionId: 'slack.message.send',
		nodeType: 'n8n-nodes-base.slack',
		actionDisplayName: 'Slack — Send a message',
		nodeDisplayName: 'Slack',
		operationDisplayName: 'Send a message',
		parameters: [
			{ label: 'Search Query', value: '"romeo"' },
			{ label: 'Return All', value: 'false' },
			{ label: 'Limit', value: '10' },
		],
		credential: { id: 'cred-1', name: 'Acme Slack', type: 'slackOAuth2Api' },
		...overrides,
	};
}

function stubNodeType(nodeType: unknown = { name: 'n8n-nodes-base.slack', displayName: 'Slack' }) {
	const store = useNodeTypesStore();
	// @ts-expect-error Known pinia issue when spying on store getters
	vi.spyOn(store, 'getNodeType', 'get').mockReturnValue(() => nodeType);
}

describe('HubActionApprovalCard', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
	});

	it('renders node icon, action title, credential chip, and parameter rows', () => {
		stubNodeType();
		const { getByTestId, getByText, queryByText } = renderComponent({
			props: { hubActionExecution: makePayload() },
		});

		expect(getByTestId('hub-action-approval-card')).toBeInTheDocument();
		expect(getByTestId('node-icon')).toBeInTheDocument();
		expect(getByText('Slack — Send a message')).toBeInTheDocument();
		expect(getByText('Acme Slack')).toBeInTheDocument();
		// "with" label
		expect(getByText('instanceAi.hubActionApproval.with')).toBeInTheDocument();
		// parameter rows
		expect(getByText('Search Query')).toBeInTheDocument();
		expect(getByText('"romeo"')).toBeInTheDocument();
		expect(getByText('Return All')).toBeInTheDocument();
		expect(getByText('false')).toBeInTheDocument();
		expect(getByText('Limit')).toBeInTheDocument();
		expect(getByText('10')).toBeInTheDocument();
		// no fallback "no inputs" message
		expect(queryByText('instanceAi.hubActionApproval.noParameters')).toBeNull();
	});

	it('hides the credential line when no credential is provided', () => {
		stubNodeType();
		const { queryByText, queryByTestId } = renderComponent({
			props: {
				hubActionExecution: makePayload({ credential: undefined }),
			},
		});

		expect(queryByText('instanceAi.hubActionApproval.with')).toBeNull();
		expect(queryByText('Acme Slack')).toBeNull();
		// Credential chip is a ResourceChip — its rendered link contains the credential name
		expect(queryByTestId('hub-action-approval-card')).toBeInTheDocument();
	});

	it('hides the parameters block when there are no parameters', () => {
		stubNodeType();
		const { queryByTestId } = renderComponent({
			props: {
				hubActionExecution: makePayload({ parameters: [] }),
			},
		});

		expect(queryByTestId('hub-action-approval-params')).toBeNull();
	});

	it('falls back to a placeholder icon when the node type is unknown', () => {
		stubNodeType(null);
		const { getByText } = renderComponent({
			props: { hubActionExecution: makePayload() },
		});

		// Fallback rendering uses first letter of nodeDisplayName uppercase
		expect(getByText('S')).toBeInTheDocument();
	});

	it('falls back to actionDisplayName when operationDisplayName is missing', () => {
		stubNodeType();
		const { getByText } = renderComponent({
			props: {
				hubActionExecution: makePayload({
					operationDisplayName: undefined,
					actionDisplayName: 'Slack Action XYZ',
				}),
			},
		});

		expect(getByText('Slack Action XYZ')).toBeInTheDocument();
	});
});
