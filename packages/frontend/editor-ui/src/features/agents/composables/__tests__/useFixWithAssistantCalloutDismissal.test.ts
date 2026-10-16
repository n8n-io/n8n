import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agentsEventBus } from '../../agents.eventBus';
import { useFixWithAssistantCalloutDismissal } from '../useFixWithAssistantCalloutDismissal';

const STORAGE_PREFIX = 'N8N_AGENT_PREVIEW_FIX_CALLOUT:';

function clearFixCalloutStorage() {
	const keys: string[] = [];
	for (let index = 0; index < sessionStorage.length; index++) {
		const key = sessionStorage.key(index);
		if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
	}
	for (const key of keys) sessionStorage.removeItem(key);
}

function readStored(sessionId: string) {
	const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
	return raw
		? (JSON.parse(raw) as { agentId: string; pending: string[]; dismissed: string[] })
		: null;
}

function mountDismissal(initialSessionId?: string) {
	const sessionId = ref(initialSessionId);
	let api!: ReturnType<typeof useFixWithAssistantCalloutDismissal>;
	const wrapper = mount(
		defineComponent({
			setup() {
				api = useFixWithAssistantCalloutDismissal(sessionId);
				return () => null;
			},
		}),
	);
	return { wrapper, api, sessionId };
}

describe('useFixWithAssistantCalloutDismissal', () => {
	beforeEach(() => {
		clearFixCalloutStorage();
	});

	afterEach(() => {
		clearFixCalloutStorage();
	});

	it('keeps accepted ids pending until the assistant writes that agent', () => {
		const { wrapper, api } = mountDismissal('session-1');
		api.trackAcceptedFixHandoff('session-1', 'agent-1', ['tc-1']);
		api.trackAcceptedFixHandoff('session-1', 'agent-1', ['tc-1', 'tc-2']);

		expect(readStored('session-1')).toEqual({
			agentId: 'agent-1',
			pending: ['tc-1', 'tc-2'],
			dismissed: [],
		});
		expect(api.dismissedToolCallIds.value).toEqual([]);

		agentsEventBus.emit('agentUpdated', { agentId: 'agent-1', source: 'agent-builder' });
		agentsEventBus.emit('agentUpdated', { agentId: 'agent-other', source: 'instance-ai' });
		expect(readStored('session-1')?.pending).toEqual(['tc-1', 'tc-2']);

		agentsEventBus.emit('agentUpdated', { agentId: 'agent-1', source: 'instance-ai' });

		expect(readStored('session-1')).toEqual({
			agentId: 'agent-1',
			pending: [],
			dismissed: ['tc-1', 'tc-2'],
		});
		expect(api.dismissedToolCallIds.value).toEqual(['tc-1', 'tc-2']);
		wrapper.unmount();

		const remounted = mountDismissal('session-1');
		expect(remounted.api.dismissedToolCallIds.value).toEqual(['tc-1', 'tc-2']);
		remounted.wrapper.unmount();
	});

	it('does not write when the session has no pending ids', () => {
		sessionStorage.setItem(
			`${STORAGE_PREFIX}session-1`,
			JSON.stringify({ agentId: 'agent-1', pending: [], dismissed: ['tc-kept'] }),
		);
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		const { wrapper } = mountDismissal('session-1');

		agentsEventBus.emit('agentUpdated', { agentId: 'agent-1', source: 'instance-ai' });

		expect(setItem).not.toHaveBeenCalled();
		expect(readStored('session-1')?.dismissed).toEqual(['tc-kept']);
		wrapper.unmount();
		setItem.mockRestore();
	});

	it('dismisses every stored session for the written agent', () => {
		const { wrapper, api } = mountDismissal('session-1');
		api.trackAcceptedFixHandoff('session-1', 'agent-1', ['tc-a']);
		api.trackAcceptedFixHandoff('session-2', 'agent-1', ['tc-b']);
		api.trackAcceptedFixHandoff('session-3', 'agent-2', ['tc-c']);

		agentsEventBus.emit('agentUpdated', { agentId: 'agent-1', source: 'instance-ai' });

		expect(readStored('session-1')?.dismissed).toEqual(['tc-a']);
		expect(readStored('session-1')?.pending).toEqual([]);
		expect(readStored('session-2')?.dismissed).toEqual(['tc-b']);
		expect(readStored('session-3')?.pending).toEqual(['tc-c']);
		wrapper.unmount();
	});
});
