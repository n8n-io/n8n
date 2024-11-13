import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast } from './useToast';
import { createPinia, setActivePinia } from 'pinia';
import { sanitizeHtml } from '@/utils/htmlUtils';

vi.mock('@/utils/htmlUtils', () => ({
	sanitizeHtml: vi.fn((str) => str),
}));

describe('useToast', () => {
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
		setActivePinia(createPinia());

		toast = useToast();
	});

	it('should show a message', () => {
		const messageData = { message: 'Test message', title: 'Test title' };
		const notification = toast.showMessage(messageData);

		expect(notification).toBeDefined();
	});

	it('should sanitize message and title', () => {
		const messageData = {
			message: '<script>alert("xss")</script>',
			title: '<script>alert("xss")</script>',
		};

		toast.showMessage(messageData);

		expect(sanitizeHtml).toHaveBeenCalledWith(messageData.message);
		expect(sanitizeHtml).toHaveBeenCalledWith(messageData.title);
	});
});
