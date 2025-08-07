import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ErrorMessage from '../ErrorMessage.vue';
import type { ChatUI } from '@n8n/chat';

// Mock dependencies
vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => {
			const translations: Record<string, string> = {
				'assistantChat.retry': 'Retry',
				'assistantChat.errorOccurred': 'An error occurred',
				'assistantChat.tryAgain': 'Try again',
			};
			return translations[key] || key;
		}),
	})),
}));

const stubs = {
	'n8n-button': {
		template:
			'<button class="n8n-button" @click="$emit(\'click\')" :disabled="disabled" :type="type"><slot /></button>',
		props: ['disabled', 'type', 'size', 'loading'],
		emits: ['click'],
	},
	'n8n-icon': {
		template: '<span class="n8n-icon" :data-icon="icon" />',
		props: ['icon'],
	},
};

const createErrorMessage = (overrides: Partial<ChatUI.ErrorMessage> = {}): ChatUI.ErrorMessage => ({
	id: '1',
	type: 'error',
	role: 'assistant',
	content: 'Something went wrong',
	read: false,
	...overrides,
});

describe('ErrorMessage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render error message correctly', () => {
			const message = createErrorMessage();
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toMatchSnapshot();
			expect(wrapper.container.textContent).toContain('Something went wrong');
		});

		it('should display error icon', () => {
			const message = createErrorMessage();
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const errorIcon = wrapper.container.querySelector('.n8n-icon');
			expect(errorIcon).toBeInTheDocument();
			expect(errorIcon).toHaveAttribute('data-icon', 'exclamation-triangle');
		});

		it('should apply error styling classes', () => {
			const message = createErrorMessage();
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const errorContainer = wrapper.container.querySelector('.error-message');
			expect(errorContainer).toBeInTheDocument();
			expect(errorContainer).toHaveClass('danger');
		});

		it('should handle empty content gracefully', () => {
			const message = createErrorMessage({ content: '' });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle null content', () => {
			const message = { ...createErrorMessage(), content: null as any };
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Error Content Display', () => {
		it('should display short error messages', () => {
			const message = createErrorMessage({
				content: 'Network error',
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Network error');
		});

		it('should display long error messages', () => {
			const longError =
				'A very long error message that explains in detail what went wrong with the request and why it failed to complete successfully';
			const message = createErrorMessage({
				content: longError,
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(longError);
		});

		it('should handle technical error messages', () => {
			const technicalError = 'TypeError: Cannot read property "map" of undefined at line 42';
			const message = createErrorMessage({
				content: technicalError,
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(technicalError);
		});

		it('should handle multiline error messages', () => {
			const multilineError = 'Error: Request failed\nStatus: 500\nDetails: Internal server error';
			const message = createErrorMessage({
				content: multilineError,
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Request failed');
			expect(wrapper.container.textContent).toContain('Status: 500');
			expect(wrapper.container.textContent).toContain('Internal server error');
		});

		it('should handle HTML in error messages safely', () => {
			const htmlError = 'Error: <script>alert("xss")</script>Invalid input';
			const message = createErrorMessage({
				content: htmlError,
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			// Should display the text but not execute scripts
			expect(wrapper.container.textContent).toContain('Invalid input');
		});
	});

	describe('Retry Functionality', () => {
		it('should show retry button when retry function is provided', () => {
			const retryFn = vi.fn();
			const message = createErrorMessage({ retry: retryFn });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			expect(retryButton).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('Retry');
		});

		it('should not show retry button when retry function is not provided', () => {
			const message = createErrorMessage();
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.n8n-button')).not.toBeInTheDocument();
		});

		it('should call retry function when retry button clicked', async () => {
			const retryFn = vi.fn().mockResolvedValue(undefined);
			const message = createErrorMessage({ retry: retryFn });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(retryButton!);

			expect(retryFn).toHaveBeenCalledTimes(1);
		});

		it('should handle retry function errors gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const retryFn = vi.fn().mockRejectedValue(new Error('Retry failed'));
			const message = createErrorMessage({ retry: retryFn });

			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(retryButton!);

			expect(retryFn).toHaveBeenCalledTimes(1);
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('should show loading state during retry', async () => {
			let resolveRetry: () => void;
			const retryPromise = new Promise<void>((resolve) => {
				resolveRetry = resolve;
			});
			const retryFn = vi.fn().mockReturnValue(retryPromise);
			const message = createErrorMessage({ retry: retryFn });

			const wrapper = render(ErrorMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'n8n-button': {
							template: '<button class="n8n-button" :data-loading="loading"><slot /></button>',
							props: ['loading', 'disabled'],
							emits: ['click'],
						},
					},
				},
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			fireEvent.click(retryButton!);

			// Button should show loading state
			await wrapper.vm.$nextTick();
			expect(retryButton).toHaveAttribute('data-loading', 'true');

			// Resolve the retry
			resolveRetry!();
			await retryPromise;
			await wrapper.vm.$nextTick();

			expect(retryButton).toHaveAttribute('data-loading', 'false');
		});

		it('should disable retry button during retry', async () => {
			let resolveRetry: () => void;
			const retryPromise = new Promise<void>((resolve) => {
				resolveRetry = resolve;
			});
			const retryFn = vi.fn().mockReturnValue(retryPromise);
			const message = createErrorMessage({ retry: retryFn });

			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			fireEvent.click(retryButton!);

			await wrapper.vm.$nextTick();
			expect(retryButton).toHaveAttribute('disabled', 'true');

			resolveRetry!();
			await retryPromise;
			await wrapper.vm.$nextTick();

			expect(retryButton).toHaveAttribute('disabled', 'false');
		});
	});

	describe('Error Types and Severity', () => {
		it('should handle different error severities', () => {
			const errorTypes = ['warning', 'error', 'critical'];

			errorTypes.forEach((severity) => {
				const message = createErrorMessage({ severity: severity as any });
				const wrapper = render(ErrorMessage, {
					props: { message },
					global: { stubs },
				});

				const container = wrapper.container.querySelector('.error-message');
				expect(container).toHaveClass(severity);
			});
		});

		it('should display appropriate icons for different error types', () => {
			const errorConfigs = [
				{ type: 'network', expectedIcon: 'wifi-slash' },
				{ type: 'validation', expectedIcon: 'exclamation-circle' },
				{ type: 'permission', expectedIcon: 'lock' },
				{ type: 'timeout', expectedIcon: 'clock' },
			];

			errorConfigs.forEach(({ type, expectedIcon }) => {
				const message = createErrorMessage({ errorType: type as any });
				const wrapper = render(ErrorMessage, {
					props: { message },
					global: { stubs },
				});

				const icon = wrapper.container.querySelector('.n8n-icon');
				expect(icon).toHaveAttribute('data-icon', expectedIcon);
			});
		});

		it('should use default error icon for unknown error types', () => {
			const message = createErrorMessage({ errorType: 'unknown-type' as any });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const icon = wrapper.container.querySelector('.n8n-icon');
			expect(icon).toHaveAttribute('data-icon', 'exclamation-triangle');
		});
	});

	describe('Error Context and Details', () => {
		it('should display error code when provided', () => {
			const message = createErrorMessage({
				content: 'Request failed',
				errorCode: 'ERR_NETWORK_001',
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('ERR_NETWORK_001');
		});

		it('should display timestamp when provided', () => {
			const timestamp = new Date('2023-01-01T12:00:00Z');
			const message = createErrorMessage({
				content: 'Operation failed',
				timestamp,
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('12:00');
		});

		it('should show expandable details when available', () => {
			const message = createErrorMessage({
				content: 'API Error',
				details: {
					statusCode: 500,
					message: 'Internal Server Error',
					stack: 'Error stack trace...',
				},
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('API Error');
			// Details should be expandable
			const expandButton = wrapper.container.querySelector('.expand-details');
			expect(expandButton).toBeInTheDocument();
		});

		it('should toggle details visibility', async () => {
			const message = createErrorMessage({
				content: 'Detailed error',
				details: { info: 'Additional context' },
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const expandButton = wrapper.container.querySelector('.expand-details');
			expect(expandButton).toBeInTheDocument();

			await fireEvent.click(expandButton!);

			expect(wrapper.container.textContent).toContain('Additional context');
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA attributes', () => {
			const message = createErrorMessage();
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const errorContainer = wrapper.container.querySelector('.error-message');
			expect(errorContainer).toHaveAttribute('role', 'alert');
			expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
		});

		it('should have accessible retry button', () => {
			const retryFn = vi.fn();
			const message = createErrorMessage({ retry: retryFn });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			expect(retryButton).toHaveAttribute('aria-label', expect.stringContaining('Retry'));
		});

		it('should announce retry results to screen readers', async () => {
			const retryFn = vi.fn().mockResolvedValue(undefined);
			const message = createErrorMessage({ retry: retryFn });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(retryButton!);

			const statusElement = wrapper.container.querySelector('[aria-live="polite"]');
			expect(statusElement).toBeInTheDocument();
		});

		it('should have proper error icon accessibility', () => {
			const message = createErrorMessage();
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const icon = wrapper.container.querySelector('.n8n-icon');
			expect(icon).toHaveAttribute('aria-hidden', 'true');
			// Error should be conveyed through text, not just icon
		});

		it('should support keyboard navigation', () => {
			const retryFn = vi.fn();
			const message = createErrorMessage({ retry: retryFn });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			expect(retryButton).not.toHaveAttribute('tabindex', '-1');
		});
	});

	describe('Edge Cases', () => {
		it('should handle message type inconsistency', () => {
			const message = { ...createErrorMessage(), type: 'not-error' as any };
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle undefined retry function', () => {
			const message = { ...createErrorMessage(), retry: undefined };
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.n8n-button')).not.toBeInTheDocument();
		});

		it('should handle null retry function', () => {
			const message = { ...createErrorMessage(), retry: null as any };
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.n8n-button')).not.toBeInTheDocument();
		});

		it('should handle very long error messages', () => {
			const longError = 'A'.repeat(10000);
			const message = createErrorMessage({ content: longError });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(longError);
		});

		it('should handle special characters in error content', () => {
			const specialError = 'Error with special chars: <>&"\'`~!@#$%^&*()[]{}|\\';
			const message = createErrorMessage({ content: specialError });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(specialError);
		});

		it('should handle Unicode in error messages', () => {
			const unicodeError = 'Error: 操作失败 🚫 العملية فشلت';
			const message = createErrorMessage({ content: unicodeError });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(unicodeError);
		});
	});

	describe('Error Recovery', () => {
		it('should emit recovery events on successful retry', async () => {
			const retryFn = vi.fn().mockResolvedValue('success');
			const message = createErrorMessage({ retry: retryFn });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(retryButton!);

			// Should emit recovery event
			const recoveryEvents = wrapper.emitted('errorRecovered');
			expect(recoveryEvents).toBeTruthy();
		});

		it('should track retry attempts', async () => {
			const retryFn = vi
				.fn()
				.mockRejectedValueOnce(new Error('First retry failed'))
				.mockRejectedValueOnce(new Error('Second retry failed'))
				.mockResolvedValueOnce('success');

			const message = createErrorMessage({ retry: retryFn });
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');

			// First retry attempt
			await fireEvent.click(retryButton!);
			expect(retryFn).toHaveBeenCalledTimes(1);

			// Second retry attempt
			await fireEvent.click(retryButton!);
			expect(retryFn).toHaveBeenCalledTimes(2);

			// Third retry attempt (successful)
			await fireEvent.click(retryButton!);
			expect(retryFn).toHaveBeenCalledTimes(3);
		});

		it('should limit retry attempts when maxRetries specified', async () => {
			const retryFn = vi.fn().mockRejectedValue(new Error('Always fails'));
			const message = createErrorMessage({
				retry: retryFn,
				maxRetries: 2,
			});
			const wrapper = render(ErrorMessage, {
				props: { message },
				global: { stubs },
			});

			const retryButton = wrapper.container.querySelector('.n8n-button');

			// First retry
			await fireEvent.click(retryButton!);
			expect(wrapper.container.querySelector('.n8n-button')).toBeInTheDocument();

			// Second retry
			await fireEvent.click(retryButton!);
			expect(wrapper.container.querySelector('.n8n-button')).toBeInTheDocument();

			// Third attempt should disable retry
			await fireEvent.click(retryButton!);
			expect(wrapper.container.querySelector('.n8n-button')).toHaveAttribute('disabled', 'true');
		});
	});
});
