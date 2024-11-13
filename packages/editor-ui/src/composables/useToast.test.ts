import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast } from './useToast';
import { createPinia, setActivePinia } from 'pinia';
import { ElNotification as Notification } from 'element-plus';

vi.mock('element-plus', async () => {
	const original = await vi.importActual('element-plus');
	return {
		...original,
		ElNotification: vi.fn(),
		ElTooltip: vi.fn(),
	};
});

describe('useToast', () => {
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
		setActivePinia(createPinia());

		toast = useToast();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should show a message', () => {
		const messageData = { message: 'Test message', title: 'Test title' };
		toast.showMessage(messageData);

		expect(Notification).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Test message',
				title: 'Test title',
			}),
		);
	});

	it('should sanitize message and title', () => {
		const messageData = {
			message: '<script>alert("xss")</script>',
			title: '<script>alert("xss")</script>',
		};

		toast.showMessage(messageData);

		expect(Notification).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'alert("xss")',
				title: 'alert("xss")',
			}),
		);
	});
});
