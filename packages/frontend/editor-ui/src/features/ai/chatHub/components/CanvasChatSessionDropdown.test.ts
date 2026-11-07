import type { ChatHubSessionDto } from '@n8n/api-types';
import { N8nDropdownMenu, type DropdownMenuItemProps } from '@n8n/design-system';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { useChatStore } from '../chat.store';
import CanvasChatSessionDropdown from './CanvasChatSessionDropdown.vue';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

const WORKFLOW_ID = 'wf-1';

function isoDaysAgo(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date.toISOString();
}

function session(overrides: Partial<ChatHubSessionDto> = {}): ChatHubSessionDto {
	return {
		id: 'session-1',
		title: 'Test Session',
		ownerId: 'user-1',
		createdAt: isoDaysAgo(0),
		updatedAt: isoDaysAgo(0),
		lastMessageAt: isoDaysAgo(0),
		credentialId: null,
		provider: 'openai',
		model: 'gpt-4',
		workflowId: WORKFLOW_ID,
		agentId: null,
		agentName: 'GPT-4',
		agentIcon: null,
		type: 'manual',
		toolIds: [],
		...overrides,
	};
}

function mountDropdown() {
	const pinia = createPinia();
	setActivePinia(pinia);
	const store = useChatStore();
	const current = session({ id: 'session-current', lastMessageAt: isoDaysAgo(0) });
	const older = session({ id: 'session-older', lastMessageAt: isoDaysAgo(1) });
	const otherWorkflow = session({
		id: 'session-other-workflow',
		workflowId: 'wf-2',
		lastMessageAt: isoDaysAgo(0),
	});
	const production = session({
		id: 'session-production',
		type: 'production',
		lastMessageAt: isoDaysAgo(0),
	});
	store.sessions.byId = {
		[current.id]: current,
		[older.id]: older,
		[otherWorkflow.id]: otherWorkflow,
		[production.id]: production,
	};
	store.sessions.ids = [current.id, older.id, otherWorkflow.id, production.id];
	const fetchSessions = vi.spyOn(store, 'fetchSessions').mockResolvedValue(undefined);

	const wrapper = mount(CanvasChatSessionDropdown, {
		props: {
			sessionId: current.id,
			sessionTitle: 'Current session',
			workflowId: WORKFLOW_ID,
		},
		global: {
			plugins: [pinia],
			stubs: {
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
			},
		},
	});

	return { wrapper, fetchSessions };
}

describe('CanvasChatSessionDropdown', () => {
	it('lists manual sessions for this workflow under date headers', () => {
		const { wrapper } = mountDropdown();
		const items = wrapper.getComponent(N8nDropdownMenu).props('items') as Array<
			DropdownMenuItemProps<string>
		>;

		expect(
			items.map((item) => ({ id: item.id, header: item.header, checked: item.checked })),
		).toEqual([
			{ id: '__group-0__', header: true, checked: undefined },
			{ id: 'session-current', header: undefined, checked: true },
			{ id: '__group-1__', header: true, checked: undefined },
			{ id: 'session-older', header: undefined, checked: false },
		]);
		expect(items[0]?.label).toBe('Today');
		expect(items[2]?.label).toBe('Yesterday');
	});

	it('emits the selected session and ignores a date header', async () => {
		const { wrapper } = mountDropdown();
		const dropdown = wrapper.getComponent(N8nDropdownMenu);

		await dropdown.vm.$emit('select', '__group-0__');
		expect(wrapper.emitted('select-session')).toBeUndefined();

		await dropdown.vm.$emit('select', 'session-older');
		expect(wrapper.emitted('select-session')).toEqual([['session-older']]);
	});

	it('fetches manual sessions the first time the menu opens', async () => {
		const { wrapper, fetchSessions } = mountDropdown();
		const dropdown = wrapper.getComponent(N8nDropdownMenu);
		let resolveFetch: () => void = () => {};
		fetchSessions.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveFetch = () => resolve(undefined);
				}),
		);

		await dropdown.vm.$emit('update:modelValue', true);
		expect(dropdown.props('loading')).toBe(true);
		expect(fetchSessions).toHaveBeenCalledTimes(1);
		expect(fetchSessions).toHaveBeenCalledWith(true, { type: 'manual' });

		resolveFetch();
		await flushPromises();
		expect(dropdown.props('loading')).toBe(false);

		await dropdown.vm.$emit('update:modelValue', false);
		await dropdown.vm.$emit('update:modelValue', true);
		expect(fetchSessions).toHaveBeenCalledTimes(1);
	});
});
