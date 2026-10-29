/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

const observe = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: vi.fn(() => ({ observe })),
}));

vi.mock('@n8n/design-system', () => ({
	N8nButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	N8nLoading: { name: 'N8nLoading', template: '<div />', props: ['loading', 'rows', 'animated'] },
	N8nText: { name: 'N8nText', template: '<span><slot /></span>', props: ['size', 'color'] },
}));

vi.mock('../components/VersionHistory/AgentVersionListItem.vue', () => ({
	default: {
		name: 'AgentVersionListItem',
		template: '<li data-testid="stub-item" />',
		props: ['item', 'actions'],
	},
}));

import AgentVersionList from '../components/VersionHistory/AgentVersionList.vue';

function makeItem(overrides: Partial<AgentVersionListItemDto> = {}): AgentVersionListItemDto {
	return {
		versionId: 'v1',
		agentId: 'agent-1',
		createdAt: '2026-01-02T10:11:12.000Z',
		updatedAt: '2026-01-02T10:11:12.000Z',
		author: 'Ada',
		isActive: false,
		...overrides,
	};
}

const defaultActions = [
	{ label: 'revert', value: 'revert', disabled: false },
	{ label: 'publish', value: 'publish', disabled: false },
];

const activeActions = [
	{ label: 'revert', value: 'revert', disabled: true },
	{ label: 'unpublish', value: 'unpublish', disabled: false },
];

function mountList() {
	return mount(AgentVersionList, {
		props: {
			items: [
				makeItem({ versionId: 'inactive', isActive: false }),
				makeItem({ versionId: 'active', isActive: true }),
			],
			actions: defaultActions,
			activeActions,
			hasMore: false,
			isInitialLoad: false,
			isLoading: false,
		},
	});
}

describe('AgentVersionList — per-row action routing', () => {
	it('routes the active-row actions to the published version and default actions to the rest', () => {
		const wrapper = mountList();
		const items = wrapper.findAllComponents({ name: 'AgentVersionListItem' });

		const inactive = items.find((c) => c.props('item').versionId === 'inactive');
		const active = items.find((c) => c.props('item').versionId === 'active');

		expect(inactive?.props('actions')).toEqual(defaultActions);
		expect(active?.props('actions')).toEqual(activeActions);
	});
	it('disables restore for the current saved draft', async () => {
		const wrapper = mountList();
		await wrapper.setProps({ items: [makeItem({ isCurrent: true })] });
		expect(wrapper.findComponent({ name: 'AgentVersionListItem' }).props('actions')).toMatchObject([
			{ value: 'revert', disabled: true },
			{ value: 'publish', disabled: false },
		]);
	});
});

describe('AgentVersionList — loading errors', () => {
	it('offers retry instead of an empty history after a failed initial load', async () => {
		const wrapper = mountList();
		await wrapper.setProps({ items: [], hasLoadError: true });
		expect(wrapper.find('[role="alert"]').exists()).toBe(true);
		await wrapper.find('button').trigger('click');
		expect(wrapper.emitted('retry')).toHaveLength(1);
	});

	it.each([true, false])('offers retry with loaded rows when hasMore is %s', async (hasMore) => {
		const wrapper = mountList();
		await wrapper.setProps({ hasLoadError: true, hasMore });
		expect(wrapper.findAllComponents({ name: 'AgentVersionListItem' })).toHaveLength(2);
		await wrapper.get('button').trigger('click');
		expect(wrapper.emitted('retry')).toHaveLength(1);
		expect(wrapper.emitted('loadMore')).toBeUndefined();

		await wrapper.setProps({ hasLoadError: false, isLoading: true });
		expect(wrapper.find('button').exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'N8nLoading' }).exists()).toBe(true);
	});

	it('does not load another page automatically while a retry is needed', async () => {
		const wrapper = mountList();
		await wrapper.setProps({ hasMore: true, hasLoadError: true });
		const { onIntersect } = vi.mocked(useIntersectionObserver).mock.lastCall![0];
		observe.mockClear();
		onIntersect();
		expect(wrapper.emitted('loadMore')).toBeUndefined();

		await wrapper.setProps({ hasLoadError: false, isLoading: true });
		onIntersect();
		expect(wrapper.emitted('loadMore')).toBeUndefined();
		expect(observe).not.toHaveBeenCalled();

		await wrapper.setProps({ isLoading: false });
		expect(observe).toHaveBeenCalledWith(
			wrapper.get('[data-test-id="agent-version-history-sentinel"]').element,
		);
		onIntersect();
		expect(wrapper.emitted('loadMore')).toHaveLength(1);
	});
});
