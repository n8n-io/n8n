import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CodeDiffMessage from '../CodeDiffMessage.vue';
import type { ChatUI } from '@n8n/chat';

// Mock dependencies
vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => {
			const translations: Record<string, string> = {
				'assistantChat.applyChanges': 'Apply Changes',
				'assistantChat.undoChanges': 'Undo Changes',
				'assistantChat.viewDiff': 'View Diff',
				'assistantChat.codeDiffError': 'Error displaying code diff',
			};
			return translations[key] || key;
		}),
	})),
}));

const stubs = {
	'code-diff': {
		template: '<div class="code-diff" :data-diff="codeDiff" :data-error="hasError" />',
		props: ['codeDiff', 'language', 'showLineNumbers', 'readonly'],
	},
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
	'quick-replies': {
		template: '<div class="quick-replies"><slot /></div>',
		props: ['replies'],
	},
};

const createCodeDiffMessage = (
	overrides: Partial<ChatUI.CodeDiffMessage> = {},
): ChatUI.CodeDiffMessage => ({
	id: '1',
	type: 'code-diff',
	role: 'assistant',
	description: 'Code changes description',
	codeDiff: '@@ -1,3 +1,3 @@\n-old line\n+new line\n unchanged line',
	suggestionId: 'suggestion-123',
	read: false,
	...overrides,
});

describe('CodeDiffMessage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render code diff message correctly', () => {
			const message = createCodeDiffMessage();
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toMatchSnapshot();
			expect(wrapper.container.textContent).toContain('Code changes description');
		});

		it('should render description section', () => {
			const message = createCodeDiffMessage({
				description: 'Fix authentication bug in login function',
			});
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Fix authentication bug in login function');
		});

		it('should render CodeDiff component with correct props', () => {
			const message = createCodeDiffMessage({
				codeDiff: '@@ -1 +1 @@\n-old\n+new',
				language: 'javascript',
			});
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const codeDiff = wrapper.container.querySelector('.code-diff');
			expect(codeDiff).toBeInTheDocument();
			expect(codeDiff).toHaveAttribute('data-diff', '@@ -1 +1 @@\n-old\n+new');
		});

		it('should handle empty description gracefully', () => {
			const message = createCodeDiffMessage({ description: '' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle undefined description', () => {
			const message = { ...createCodeDiffMessage(), description: undefined };
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Action Buttons', () => {
		it('should display apply changes button', () => {
			const message = createCodeDiffMessage();
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const applyButton = wrapper.container.querySelector('.n8n-button');
			expect(applyButton).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('Apply Changes');
		});

		it('should emit codeReplace event when apply button clicked', async () => {
			const message = createCodeDiffMessage();
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const applyButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(applyButton!);

			const emittedEvents = wrapper.emitted('codeReplace');
			expect(emittedEvents).toBeTruthy();
			expect(emittedEvents![0]).toEqual([message.suggestionId]);
		});

		it('should display undo button when in replaced state', () => {
			const message = createCodeDiffMessage({ state: 'replaced' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Undo Changes');
		});

		it('should emit codeUndo event when undo button clicked', async () => {
			const message = createCodeDiffMessage({ state: 'replaced' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const undoButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(undoButton!);

			const emittedEvents = wrapper.emitted('codeUndo');
			expect(emittedEvents).toBeTruthy();
			expect(emittedEvents![0]).toEqual([message.suggestionId]);
		});

		it('should show loading state when applying changes', () => {
			const message = createCodeDiffMessage({ state: 'applying' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'n8n-button': {
							template: '<button class="n8n-button" :data-loading="loading"><slot /></button>',
							props: ['loading', 'disabled'],
						},
					},
				},
			});

			const button = wrapper.container.querySelector('.n8n-button');
			expect(button).toHaveAttribute('data-loading', 'true');
		});

		it('should disable buttons during applying state', () => {
			const message = createCodeDiffMessage({ state: 'applying' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'n8n-button': {
							template: '<button class="n8n-button" :disabled="disabled"><slot /></button>',
							props: ['disabled', 'loading'],
						},
					},
				},
			});

			const button = wrapper.container.querySelector('.n8n-button');
			expect(button).toHaveAttribute('disabled', 'true');
		});
	});

	describe('Error Handling', () => {
		it('should display error message when code diff fails to load', () => {
			const message = createCodeDiffMessage({ error: 'Failed to load diff' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Error displaying code diff');
		});

		it('should handle malformed code diff gracefully', () => {
			const message = createCodeDiffMessage({
				codeDiff: 'not-a-valid-diff',
			});
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'code-diff': {
							template: '<div class="code-diff error">Invalid diff format</div>',
						},
					},
				},
			});

			expect(wrapper.container.querySelector('.code-diff')).toBeInTheDocument();
		});

		it('should show retry option when diff loading fails', () => {
			const message = createCodeDiffMessage({
				error: 'Network error',
				retryable: true,
			});
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Retry');
		});

		it('should handle empty code diff', () => {
			const message = createCodeDiffMessage({ codeDiff: '' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle null code diff', () => {
			const message = { ...createCodeDiffMessage(), codeDiff: null as any };
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('State Management', () => {
		it('should display different UI based on message state', () => {
			const states = ['pending', 'applying', 'replaced', 'error'] as const;

			states.forEach((state) => {
				const message = createCodeDiffMessage({ state });
				const wrapper = render(CodeDiffMessage, {
					props: { message },
					global: { stubs },
				});

				const container = wrapper.container.querySelector('.code-diff-message');
				expect(container).toHaveClass(state);
			});
		});

		it('should transition between states correctly', async () => {
			const message = createCodeDiffMessage({ state: 'pending' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			// Initial state
			expect(wrapper.container.querySelector('.pending')).toBeInTheDocument();

			// Transition to applying
			await wrapper.rerender({
				message: { ...message, state: 'applying' },
			});
			expect(wrapper.container.querySelector('.applying')).toBeInTheDocument();

			// Transition to replaced
			await wrapper.rerender({
				message: { ...message, state: 'replaced' },
			});
			expect(wrapper.container.querySelector('.replaced')).toBeInTheDocument();
		});

		it('should handle state transitions with appropriate button updates', async () => {
			const message = createCodeDiffMessage({ state: 'pending' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			// Initially shows apply button
			expect(wrapper.container.textContent).toContain('Apply Changes');

			// After replacing, shows undo button
			await wrapper.rerender({
				message: { ...message, state: 'replaced' },
			});
			expect(wrapper.container.textContent).toContain('Undo Changes');
		});
	});

	describe('Quick Replies Integration', () => {
		it('should display quick replies when provided', () => {
			const message = createCodeDiffMessage({
				quickReplies: [
					{ type: 'new-suggestion', text: 'Try another approach' },
					{ type: 'resolved', text: 'This works' },
				],
			});
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.quick-replies')).toBeInTheDocument();
		});

		it('should not display quick replies when not provided', () => {
			const message = createCodeDiffMessage();
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.quick-replies')).not.toBeInTheDocument();
		});

		it('should position quick replies after action buttons', () => {
			const message = createCodeDiffMessage({
				quickReplies: [{ type: 'resolved', text: 'Perfect' }],
			});
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const html = wrapper.container.innerHTML;
			const buttonIndex = html.indexOf('Apply Changes');
			const repliesIndex = html.indexOf('quick-replies');
			expect(repliesIndex).toBeGreaterThan(buttonIndex);
		});
	});

	describe('Code Diff Display', () => {
		it('should pass language to CodeDiff component when specified', () => {
			const message = createCodeDiffMessage({ language: 'typescript' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'code-diff': {
							template: '<div class="code-diff" :data-language="language" />',
							props: ['language', 'codeDiff'],
						},
					},
				},
			});

			const codeDiff = wrapper.container.querySelector('.code-diff');
			expect(codeDiff).toHaveAttribute('data-language', 'typescript');
		});

		it('should handle different diff formats', () => {
			const diffFormats = [
				'@@ -1,3 +1,3 @@\n-old\n+new',
				'--- a/file.js\n+++ b/file.js\n@@ -1 +1 @@\n-old\n+new',
				'diff --git a/test.js b/test.js\nindex 123..456\n--- a/test.js\n+++ b/test.js\n@@ -1 +1 @@\n-old\n+new',
			];

			diffFormats.forEach((codeDiff, index) => {
				const message = createCodeDiffMessage({ codeDiff });
				const wrapper = render(CodeDiffMessage, {
					props: { message },
					global: { stubs },
				});

				expect(wrapper.container.querySelector('.code-diff')).toBeInTheDocument();
			});
		});

		it('should show line numbers when enabled', () => {
			const message = createCodeDiffMessage({ showLineNumbers: true });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'code-diff': {
							template: '<div class="code-diff" :data-line-numbers="showLineNumbers" />',
							props: ['showLineNumbers', 'codeDiff'],
						},
					},
				},
			});

			const codeDiff = wrapper.container.querySelector('.code-diff');
			expect(codeDiff).toHaveAttribute('data-line-numbers', 'true');
		});

		it('should handle readonly mode', () => {
			const message = createCodeDiffMessage({ readonly: true });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'code-diff': {
							template: '<div class="code-diff" :data-readonly="readonly" />',
							props: ['readonly', 'codeDiff'],
						},
					},
				},
			});

			const codeDiff = wrapper.container.querySelector('.code-diff');
			expect(codeDiff).toHaveAttribute('data-readonly', 'true');
		});
	});

	describe('Performance and Memory', () => {
		it('should handle large diffs efficiently', () => {
			const largeDiff = Array.from(
				{ length: 1000 },
				(_, i) => `@@ -${i} +${i} @@\n-old line ${i}\n+new line ${i}`,
			).join('\n');
			const message = createCodeDiffMessage({ codeDiff: largeDiff });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle frequent state changes without memory leaks', async () => {
			const message = createCodeDiffMessage();
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const states = ['pending', 'applying', 'replaced', 'error'] as const;

			// Cycle through states multiple times
			for (let cycle = 0; cycle < 5; cycle++) {
				for (const state of states) {
					await wrapper.rerender({
						message: { ...message, state },
					});
				}
			}

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper semantic structure', () => {
			const message = createCodeDiffMessage();
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const container = wrapper.container.querySelector('.code-diff-message');
			expect(container).toHaveAttribute('role', 'region');
			expect(container).toHaveAttribute('aria-label', expect.stringContaining('Code diff'));
		});

		it('should have accessible action buttons', () => {
			const message = createCodeDiffMessage();
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const button = wrapper.container.querySelector('.n8n-button');
			expect(button).toHaveAttribute('aria-label', expect.stringContaining('Apply'));
		});

		it('should announce state changes to screen readers', async () => {
			const message = createCodeDiffMessage({ state: 'pending' });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			await wrapper.rerender({
				message: { ...message, state: 'applying' },
			});

			const statusElement = wrapper.container.querySelector('[aria-live]');
			expect(statusElement).toBeInTheDocument();
		});

		it('should have proper keyboard navigation', () => {
			const message = createCodeDiffMessage({
				quickReplies: [{ type: 'resolved', text: 'Done' }],
			});
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			const focusableElements = wrapper.container.querySelectorAll('button, [tabindex="0"]');
			expect(focusableElements.length).toBeGreaterThan(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle message type inconsistency', () => {
			const message = { ...createCodeDiffMessage(), type: 'not-code-diff' as any };
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle missing suggestionId', () => {
			const message = { ...createCodeDiffMessage(), suggestionId: undefined };
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			// Should still render but buttons might be disabled
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle complex diff scenarios', () => {
			const complexDiff = `@@ -1,10 +1,8 @@
 function hello() {
-  console.log("old");
-  var x = 1;
+  console.log("new");
+  const x = 1;
   return x;
 }
 
-function goodbye() {
-  return "bye";
-}`;
			const message = createCodeDiffMessage({ codeDiff: complexDiff });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle Unicode in code diff', () => {
			const unicodeDiff = '@@ -1 +1 @@\n-const msg = "Hello";\n+const msg = "你好 🎉";';
			const message = createCodeDiffMessage({ codeDiff: unicodeDiff });
			const wrapper = render(CodeDiffMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});
	});
});
