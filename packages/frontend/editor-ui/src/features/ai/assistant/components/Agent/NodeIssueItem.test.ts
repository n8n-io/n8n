import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import NodeIssueItem from './NodeIssueItem.vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { injectNDVStore, useNDVStore, type NDVStoreId } from '@/features/ndv/shared/ndv.store';

vi.mock('@/features/ndv/shared/ndv.store', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/features/ndv/shared/ndv.store')>();
	return { ...original, injectNDVStore: vi.fn() };
});

const TEST_NDV_STORE_ID = 'node-issue-item-test@latest' as NDVStoreId;

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		template: '<span />',
	},
}));

const renderComponent = createComponentRenderer(NodeIssueItem);

function formatIssueMessage(value: string | string[]) {
	return Array.isArray(value) ? value.join(', ') : value;
}

describe('NodeIssueItem', () => {
	let ndvStore: ReturnType<typeof mockedStore<() => ReturnType<typeof useNDVStore>>>;
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		ndvStore = mockedStore(() => useNDVStore(TEST_NDV_STORE_ID));
		ndvStore.setActiveNodeName = vi.fn();
		vi.mocked(injectNDVStore).mockReturnValue(
			ndvStore as unknown as ReturnType<typeof injectNDVStore>,
		);
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

	it('emits click event when item is clicked', async () => {
		const nodeType = {
			name: 'n8n-nodes-base.linear',
			displayName: 'Linear',
		} as INodeTypeDescription;
		const { getByLabelText, emitted } = renderComponent({
			pinia,
			props: {
				issue: { node: 'Linear', type: 'parameters', value: 'Missing API key' },
				getNodeType: vi.fn(() => nodeType),
				formatIssueMessage,
			},
		});

		await fireEvent.click(getByLabelText('Edit Linear node'));

		expect(emitted().click).toHaveLength(1);
	});
});
