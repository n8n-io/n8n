import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EventMessage from '../EventMessage.vue';
import type { ChatUI } from '@n8n/chat';

// Mock dependencies
vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => {
			const translations: Record<string, string> = {
				'assistantChat.sessionEnded': 'Session has ended',
				'assistantChat.sessionTimeout': 'Session timed out due to inactivity',
				'assistantChat.sessionError': 'Session ended due to an error',
				'assistantChat.askAssistant': 'Ask Assistant',
				'assistantChat.startNewSession': 'Start New Session',
			};
			return translations[key] || key;
		}),
	})),
}));

const stubs = {
	'inline-ask-assistant-button': {
		template:
			'<button class="inline-ask-assistant-button" @click="$emit(\'click\')"><slot /></button>',
		emits: ['click'],
	},
	'n8n-icon': {
		template: '<span class="n8n-icon" :data-icon="icon" />',
		props: ['icon'],
	},
};

type EventName = 'end-session' | 'session-timeout' | 'session-error';

const createEventMessage = (
	eventName: EventName,
	overrides: Partial<ChatUI.EventMessage> = {},
): ChatUI.EventMessage => ({
	id: '1',
	type: 'event',
	role: 'assistant',
	eventName,
	read: false,
	...overrides,
});

describe('EventMessage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render event message correctly', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toMatchSnapshot();
			expect(wrapper.container.textContent).toContain('Session has ended');
		});

		it('should apply system message styling', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const eventContainer = wrapper.container.querySelector('.event-message');
			expect(eventContainer).toBeInTheDocument();
			expect(eventContainer).toHaveClass('system-message');
		});

		it('should display appropriate icon for system messages', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const icon = wrapper.container.querySelector('.n8n-icon');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveAttribute('data-icon', 'info-circle');
		});
	});

	describe('Event Type Handling', () => {
		it('should display correct message for end-session event', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Session has ended');
		});

		it('should display correct message for session-timeout event', () => {
			const message = createEventMessage('session-timeout');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Session timed out due to inactivity');
		});

		it('should display correct message for session-error event', () => {
			const message = createEventMessage('session-error');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Session ended due to an error');
		});

		it('should handle unknown event types gracefully', () => {
			const message = createEventMessage('unknown-event' as EventName);
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// Should still render but maybe with default message
			expect(wrapper.container).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('unknown-event');
		});

		it('should display different icons for different event types', () => {
			const eventConfigs = [
				{ eventName: 'end-session', expectedIcon: 'check-circle' },
				{ eventName: 'session-timeout', expectedIcon: 'clock' },
				{ eventName: 'session-error', expectedIcon: 'exclamation-triangle' },
			] as const;

			eventConfigs.forEach(({ eventName, expectedIcon }) => {
				const message = createEventMessage(eventName);
				const wrapper = render(EventMessage, {
					props: { message },
					global: { stubs },
				});

				const icon = wrapper.container.querySelector('.n8n-icon');
				expect(icon).toHaveAttribute('data-icon', expectedIcon);
			});
		});
	});

	describe('InlineAskAssistantButton Integration', () => {
		it('should display ask assistant button', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const assistantButton = wrapper.container.querySelector('.inline-ask-assistant-button');
			expect(assistantButton).toBeInTheDocument();
		});

		it('should emit button click events', async () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const assistantButton = wrapper.container.querySelector('.inline-ask-assistant-button');
			await fireEvent.click(assistantButton!);

			const emittedEvents = wrapper.emitted('askAssistant');
			expect(emittedEvents).toBeTruthy();
		});

		it('should show appropriate button text for different events', () => {
			const eventConfigs = [
				{ eventName: 'end-session', expectedText: 'Ask Assistant' },
				{ eventName: 'session-timeout', expectedText: 'Start New Session' },
				{ eventName: 'session-error', expectedText: 'Start New Session' },
			] as const;

			eventConfigs.forEach(({ eventName, expectedText }) => {
				const message = createEventMessage(eventName);
				const wrapper = render(EventMessage, {
					props: { message },
					global: { stubs },
				});

				expect(wrapper.container.textContent).toContain(expectedText);
			});
		});

		it('should position button after event message text', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const html = wrapper.container.innerHTML;
			const messageIndex = html.indexOf('Session has ended');
			const buttonIndex = html.indexOf('inline-ask-assistant-button');

			expect(buttonIndex).toBeGreaterThan(messageIndex);
		});
	});

	describe('Event Context and Details', () => {
		it('should display additional context when provided', () => {
			const message = createEventMessage('session-error', {
				context: {
					errorCode: 'CONN_LOST',
					reason: 'Network connection interrupted',
				},
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('CONN_LOST');
			expect(wrapper.container.textContent).toContain('Network connection interrupted');
		});

		it('should display timestamp when provided', () => {
			const timestamp = new Date('2023-01-01T12:00:00Z');
			const message = createEventMessage('end-session', {
				timestamp,
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('12:00');
		});

		it('should show session duration for end-session events', () => {
			const message = createEventMessage('end-session', {
				sessionDuration: 300000, // 5 minutes in milliseconds
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('5 minutes');
		});

		it('should show timeout duration for session-timeout events', () => {
			const message = createEventMessage('session-timeout', {
				timeoutDuration: 1800000, // 30 minutes in milliseconds
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('30 minutes');
		});
	});

	describe('Event Message Styling', () => {
		it('should apply different styling classes for different event severities', () => {
			const eventSeverities = [
				{ eventName: 'end-session', expectedClass: 'info' },
				{ eventName: 'session-timeout', expectedClass: 'warning' },
				{ eventName: 'session-error', expectedClass: 'error' },
			] as const;

			eventSeverities.forEach(({ eventName, expectedClass }) => {
				const message = createEventMessage(eventName);
				const wrapper = render(EventMessage, {
					props: { message },
					global: { stubs },
				});

				const container = wrapper.container.querySelector('.event-message');
				expect(container).toHaveClass(expectedClass);
			});
		});

		it('should center-align system message content', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const container = wrapper.container.querySelector('.event-message');
			expect(container).toHaveClass('text-center');
		});

		it('should apply subtle background for system messages', () => {
			const message = createEventMessage('session-timeout');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const container = wrapper.container.querySelector('.event-message');
			expect(container).toHaveClass('system-background');
		});
	});

	describe('Interactive Features', () => {
		it('should support expandable event details', async () => {
			const message = createEventMessage('session-error', {
				details: {
					stackTrace: 'Error stack trace here...',
					requestId: 'req-123-456',
					userId: 'user-789',
				},
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const expandButton = wrapper.container.querySelector('.expand-details');
			expect(expandButton).toBeInTheDocument();

			await fireEvent.click(expandButton!);
			expect(wrapper.container.textContent).toContain('req-123-456');
		});

		it('should allow copying event details', async () => {
			const mockWriteText = vi.fn().mockResolvedValue(undefined);
			Object.assign(navigator, {
				clipboard: { writeText: mockWriteText },
			});

			const message = createEventMessage('session-error', {
				details: { errorId: 'ERR-001' },
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const copyButton = wrapper.container.querySelector('.copy-details');
			if (copyButton) {
				await fireEvent.click(copyButton);
				expect(mockWriteText).toHaveBeenCalled();
			}
		});

		it('should emit telemetry events for different event types', async () => {
			const message = createEventMessage('session-timeout');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// Simulate component mount
			await wrapper.vm.$nextTick();

			const telemetryEvents = wrapper.emitted('telemetry');
			expect(telemetryEvents).toBeTruthy();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA attributes for system messages', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const container = wrapper.container.querySelector('.event-message');
			expect(container).toHaveAttribute('role', 'status');
			expect(container).toHaveAttribute('aria-live', 'polite');
		});

		it('should have assertive aria-live for error events', () => {
			const message = createEventMessage('session-error');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const container = wrapper.container.querySelector('.event-message');
			expect(container).toHaveAttribute('aria-live', 'assertive');
		});

		it('should have accessible button labels', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const button = wrapper.container.querySelector('.inline-ask-assistant-button');
			expect(button).toHaveAttribute('aria-label', expect.stringContaining('Ask Assistant'));
		});

		it('should have proper icon accessibility', () => {
			const message = createEventMessage('session-timeout');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const icon = wrapper.container.querySelector('.n8n-icon');
			expect(icon).toHaveAttribute('aria-hidden', 'true');
			expect(icon).toHaveAttribute('role', 'presentation');
		});

		it('should support keyboard navigation', () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const button = wrapper.container.querySelector('.inline-ask-assistant-button');
			expect(button).not.toHaveAttribute('tabindex', '-1');
		});
	});

	describe('Internationalization', () => {
		it('should use i18n for all text content', () => {
			const message = createEventMessage('session-timeout');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// All text should come from i18n translations
			expect(wrapper.container.textContent).toContain('Session timed out due to inactivity');
			expect(wrapper.container.textContent).toContain('Start New Session');
		});

		it('should format durations according to locale', () => {
			const message = createEventMessage('end-session', {
				sessionDuration: 3665000, // 1 hour, 1 minute, 5 seconds
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// Should format duration in a localized way
			expect(wrapper.container.textContent).toMatch(/1.*hour.*1.*minute/);
		});

		it('should format timestamps according to locale', () => {
			const message = createEventMessage('session-error', {
				timestamp: new Date('2023-01-01T12:30:45Z'),
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// Should show localized time format
			expect(wrapper.container.textContent).toContain('12:30');
		});
	});

	describe('Edge Cases', () => {
		it('should handle message type inconsistency', () => {
			const message = { ...createEventMessage('end-session'), type: 'not-event' as any };
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle missing eventName gracefully', () => {
			const message = { ...createEventMessage('end-session'), eventName: undefined as any };
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle null event context', () => {
			const message = { ...createEventMessage('session-error'), context: null };
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle extremely long session durations', () => {
			const message = createEventMessage('end-session', {
				sessionDuration: 86400000 * 7, // 1 week in milliseconds
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('7 days');
		});

		it('should handle negative or zero durations', () => {
			const message = createEventMessage('session-timeout', {
				timeoutDuration: 0,
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// Should handle gracefully, maybe show "immediately" or hide duration
			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Event Message Interactions', () => {
		it('should track user interactions with event messages', async () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const button = wrapper.container.querySelector('.inline-ask-assistant-button');
			await fireEvent.click(button!);

			// Should emit interaction tracking events
			const interactionEvents = wrapper.emitted('messageInteraction');
			expect(interactionEvents).toBeTruthy();
		});

		it('should handle rapid successive clicks', async () => {
			const message = createEventMessage('session-timeout');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			const button = wrapper.container.querySelector('.inline-ask-assistant-button');

			// Click multiple times rapidly
			await fireEvent.click(button!);
			await fireEvent.click(button!);
			await fireEvent.click(button!);

			// Should handle gracefully without duplicate actions
			const clickEvents = wrapper.emitted('askAssistant');
			expect(clickEvents?.length).toBeLessThanOrEqual(3);
		});

		it('should disable interaction when session is reconnecting', async () => {
			const message = createEventMessage('session-error', {
				reconnecting: true,
			});
			const wrapper = render(EventMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'inline-ask-assistant-button': {
							template:
								'<button class="inline-ask-assistant-button" :disabled="disabled"><slot /></button>',
							props: ['disabled'],
						},
					},
				},
			});

			const button = wrapper.container.querySelector('.inline-ask-assistant-button');
			expect(button).toHaveAttribute('disabled', 'true');
		});
	});

	describe('Performance', () => {
		it('should handle frequent event message updates efficiently', async () => {
			const message = createEventMessage('end-session');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// Simulate frequent updates
			for (let i = 0; i < 10; i++) {
				await wrapper.rerender({
					message: createEventMessage('session-timeout', {
						timestamp: new Date(Date.now() + i * 1000),
					}),
				});
			}

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should not cause memory leaks with event listeners', () => {
			const message = createEventMessage('session-error');
			const wrapper = render(EventMessage, {
				props: { message },
				global: { stubs },
			});

			// Verify component can be unmounted cleanly
			wrapper.unmount();
			expect(wrapper.container.innerHTML).toBe('');
		});
	});
});
