import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import NodeIssueItem from './NodeIssueItem.vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';

vi.mock('@/components/NodeIcon.vue', () => ({
	default: {
		template: '<span />',
	},
}));

const renderComponent = createComponentRenderer(NodeIssueItem);

function formatIssueMessage(value: string | string[]) {
	return Array.isArray(value) ? value.join(', ') : value;
}

describe('NodeIssueItem', () => {
	let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		ndvStore = mockedStore(useNDVStore);
		ndvStore.setActiveNodeName = vi.fn();
	});

	it('renders issue information using provided formatter', () => {
		const { getByText } = renderComponent({
			pinia,
			props: {
				issue: { node: 'Linear', type: 'parameters', value: 'Missing API key' },
				getNodeType: vi.fn(),
				formatIssueMessage,
			},
		});

		expect(getByText('Linear:')).toBeInTheDocument();
		expect(getByText('Missing API key')).toBeInTheDocument();
	});

	it('opens NDV on edit button click', async () => {
		const nodeType = {
			name: 'n8n-nodes-base.linear',
			displayName: 'Linear',
		} as INodeTypeDescription;
		const { getByLabelText } = renderComponent({
			pinia,
			props: {
				issue: { node: 'Linear', type: 'parameters', value: 'Missing API key' },
				getNodeType: vi.fn(() => nodeType),
				formatIssueMessage,
			},
		});

		await fireEvent.click(getByLabelText('Edit Linear node'));
		expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith('Linear', 'other');
	});
});
