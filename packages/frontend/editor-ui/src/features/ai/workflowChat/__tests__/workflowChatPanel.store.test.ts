import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowChatPanelStore } from '../workflowChatPanel.store';

describe('workflowChatPanel store', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it('starts closed and toggles', () => {
		const s = useWorkflowChatPanelStore();
		expect(s.isOpen).toBe(false);
		s.toggle();
		expect(s.isOpen).toBe(true);
		s.close();
		expect(s.isOpen).toBe(false);
	});

	it('clamps width to min/max', () => {
		const s = useWorkflowChatPanelStore();
		s.updateWidth(100);
		expect(s.width).toBe(s.MIN_WIDTH);
		s.updateWidth(9999);
		expect(s.width).toBe(s.MAX_WIDTH);
	});

	it('tracks the thread id when set', () => {
		const s = useWorkflowChatPanelStore();
		expect(s.threadId).toBeNull();
		s.setThreadId('thread-abc');
		expect(s.threadId).toBe('thread-abc');
	});
});
