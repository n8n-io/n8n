import type { PushMessage } from '@n8n/api-types';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';

import { useInboxSync } from './useInboxSync';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';

const removeListener = vi.fn();
const inbox = reactive({
	enabled: true,
	isActive: false,
	refreshVisibleInbox: vi.fn(async () => {}),
	fetchSummary: vi.fn(async () => {}),
});
const push = reactive({
	isConnected: false,
	addEventListener: vi.fn((_listener: OnPushMessageHandler) => removeListener),
});
vi.mock('@n8n/frontend-module-inbox', () => ({ useInboxStore: () => inbox }));
vi.mock('@/app/stores/pushConnection.store', () => ({ usePushConnectionStore: () => push }));

const reviewEvent = { type: 'workflowReviewStateChanged', data: {} } as PushMessage;
function renderSync() {
	return mount(defineComponent({ setup: useInboxSync, template: '<div />' }));
}
async function sendReviewEvent() {
	push.addEventListener.mock.calls.at(-1)![0](reviewEvent);
	await flushPromises();
}

beforeEach(() => {
	vi.clearAllMocks();
	inbox.enabled = true;
	inbox.isActive = false;
	push.isConnected = false;
});
afterEach(() => vi.restoreAllMocks());

it('updates the navigation badge when a review changes outside Inbox', async () => {
	const view = renderSync();
	await sendReviewEvent();
	expect(inbox.fetchSummary).toHaveBeenCalledOnce();
	expect(inbox.refreshVisibleInbox).not.toHaveBeenCalled();
	view.unmount();
});

it('refreshes the mounted Inbox with its selected detail', async () => {
	inbox.isActive = true;
	const view = renderSync();
	await sendReviewEvent();
	expect(inbox.refreshVisibleInbox).toHaveBeenCalledOnce();
	expect(inbox.fetchSummary).not.toHaveBeenCalled();
	view.unmount();
});

it('refreshes counts after reconnecting outside Inbox', async () => {
	const view = renderSync();
	push.isConnected = true;
	await flushPromises();
	expect(inbox.fetchSummary).toHaveBeenCalledOnce();
	view.unmount();
});

it.each(['focus', 'visibilitychange'])(
	'refreshes missed updates on %s outside Inbox',
	async (event) => {
		const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
		push.isConnected = true;
		const view = renderSync();
		await sendReviewEvent();
		expect(inbox.fetchSummary).not.toHaveBeenCalled();

		hidden.mockReturnValue(false);
		const target = event === 'focus' ? window : document;
		target.dispatchEvent(new Event(event));
		await flushPromises();

		expect(inbox.fetchSummary).toHaveBeenCalledOnce();
		expect(inbox.refreshVisibleInbox).not.toHaveBeenCalled();
		view.unmount();
	},
);

it.each(['disabled', 'active', 'hidden'] as const)(
	'does not refresh the summary on return when Inbox is %s',
	async (condition) => {
		if (condition === 'disabled') inbox.enabled = false;
		if (condition === 'active') inbox.isActive = true;
		if (condition === 'hidden') vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
		const view = renderSync();
		await flushPromises();
		window.dispatchEvent(new Event('focus'));
		document.dispatchEvent(new Event('visibilitychange'));
		await flushPromises();

		expect(inbox.fetchSummary).not.toHaveBeenCalled();
		expect(inbox.refreshVisibleInbox).not.toHaveBeenCalled();
		view.unmount();
	},
);

it.each(['disabled', 'hidden'] as const)('does not request %s Inbox data', async (condition) => {
	if (condition === 'disabled') inbox.enabled = false;
	else vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
	const view = renderSync();
	await sendReviewEvent();
	expect(inbox.fetchSummary).not.toHaveBeenCalled();
	expect(inbox.refreshVisibleInbox).not.toHaveBeenCalled();
	view.unmount();
});

it('removes the listeners when its scope is destroyed', async () => {
	const view = renderSync();
	await flushPromises();
	view.unmount();
	window.dispatchEvent(new Event('focus'));
	document.dispatchEvent(new Event('visibilitychange'));
	await flushPromises();
	expect(inbox.fetchSummary).not.toHaveBeenCalled();
	expect(removeListener).toHaveBeenCalledOnce();
});
