import { configure, fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';

import N8nChatHintPopover from '../components/N8nChatHintPopover.vue';
import { N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS } from '../constants';

configure({ testIdAttribute: 'data-test-id' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const trackViewedN8nChatHint = vi.fn();
const trackDismissedN8nChatHint = vi.fn();
vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackViewedN8nChatHint, trackDismissedN8nChatHint }),
}));

const stubs = {
	N8nPopover: {
		props: ['open'],
		emits: ['update:open'],
		template:
			'<div><slot name="trigger" /><div v-if="open"><slot name="content" /><button data-test-id="outside" @click="$emit(\'update:open\', false)" /></div></div>',
	},
	N8nText: { template: '<span><slot /></span>' },
	N8nButton: {
		props: ['label'],
		template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
	},
};

const renderComponent = createComponentRenderer(N8nChatHintPopover, { global: { stubs } });

const baseProps = {
	hint: 'channel_chip' as const,
	title: 'Title',
	body: 'Body',
	agentId: 'a1',
};

describe('N8nChatHintPopover', () => {
	beforeEach(() => {
		createTestingPinia();
		localStorage.removeItem(N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip);
		trackViewedN8nChatHint.mockClear();
		trackDismissedN8nChatHint.mockClear();
	});

	it('shows the hint and tracks the view when active', () => {
		const { getByTestId } = renderComponent({ props: { ...baseProps, active: true } });

		expect(getByTestId('n8n-chat-hint-channel_chip')).toBeInTheDocument();
		expect(trackViewedN8nChatHint).toHaveBeenCalledExactlyOnceWith({
			hint: 'channel_chip',
			agentId: 'a1',
		});
	});

	it('tracks the view once when the hint opens again', async () => {
		const { rerender } = renderComponent({ props: { ...baseProps, active: true } });

		await rerender({ ...baseProps, active: false });
		await rerender({ ...baseProps, active: true });

		expect(trackViewedN8nChatHint).toHaveBeenCalledTimes(1);
	});

	it('stays closed and tracks nothing when inactive', () => {
		const { queryByTestId } = renderComponent({ props: { ...baseProps, active: false } });

		expect(queryByTestId('n8n-chat-hint-channel_chip')).toBeNull();
		expect(trackViewedN8nChatHint).not.toHaveBeenCalled();
	});

	it('remembers "Got it" and tracks the dismissal', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { ...baseProps, active: true },
		});

		await fireEvent.click(getByTestId('n8n-chat-hint-channel_chip-got-it'));

		expect(localStorage.getItem(N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip)).toBe('true');
		expect(trackDismissedN8nChatHint).toHaveBeenCalledExactlyOnceWith({
			hint: 'channel_chip',
			agentId: 'a1',
		});
		expect(queryByTestId('n8n-chat-hint-channel_chip')).toBeNull();
	});

	it('stays open when the popover reports an outside interaction', async () => {
		const { getByTestId } = renderComponent({ props: { ...baseProps, active: true } });

		await fireEvent.click(getByTestId('outside'));

		expect(getByTestId('n8n-chat-hint-channel_chip')).toBeInTheDocument();
		expect(localStorage.getItem(N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip)).toBeNull();
		expect(trackDismissedN8nChatHint).not.toHaveBeenCalled();
	});

	it('never shows a hint the user already dismissed', () => {
		localStorage.setItem(N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip, 'true');

		const { queryByTestId } = renderComponent({ props: { ...baseProps, active: true } });

		expect(queryByTestId('n8n-chat-hint-channel_chip')).toBeNull();
		expect(trackViewedN8nChatHint).not.toHaveBeenCalled();
	});
});
