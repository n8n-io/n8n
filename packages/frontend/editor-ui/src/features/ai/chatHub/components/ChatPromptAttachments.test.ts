import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ChatPromptCompact from './ChatPromptCompact.vue';
import ChatPromptFull from './ChatPromptFull.vue';

describe.each([
	['compact', createComponentRenderer(ChatPromptCompact)],
	['full', createComponentRenderer(ChatPromptFull)],
] as const)('ChatPrompt %s', (_layout, renderComponent) => {
	it('names the voice action and blocks it while messaging is busy', async () => {
		const user = userEvent.setup();
		const { getByRole, emitted, rerender } = renderComponent({
			props: {
				message: '',
				attachments: [],
				placeholder: 'Message',
				messagingState: 'receiving',
				acceptedMimeTypes: '',
				canUploadFiles: true,
				isSpeechSupported: true,
				isListening: false,
				checkedToolIds: [],
				isToolsSelectable: false,
				selectedModel: null,
			},
			global: { stubs: { ToolsSelector: true } },
		});
		const button = getByRole('button', { name: 'Voice input' });
		expect(button).not.toBeDisabled();
		expect(button).toHaveAttribute('aria-disabled', 'true');
		button.focus();
		expect(button).toHaveFocus();
		await user.click(button);
		await user.keyboard('{Enter} ');
		expect(emitted('mic')).toBeUndefined();
		expect(emitted('submit')).toBeUndefined();

		await rerender({ messagingState: 'idle', isListening: true });
		expect(button).toHaveAccessibleName('Stop recording');
		expect(button).not.toHaveAttribute('aria-disabled');
		await user.click(button);
		expect(emitted('mic')).toEqual([[]]);
	});

	it('keeps the attachment explanation visible when the tooltip is closed', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				message: '',
				attachments: [],
				placeholder: 'Message',
				messagingState: 'idle',
				acceptedMimeTypes: '',
				canUploadFiles: false,
				isSpeechSupported: false,
				isListening: false,
				checkedToolIds: [],
				isToolsSelectable: false,
				selectedModel: null,
			},
			global: { stubs: { ToolsSelector: true } },
		});
		const button = getByRole('button', { name: 'Attach' });
		expect(button).not.toBeDisabled();
		expect(button).toHaveAttribute('aria-disabled', 'true');
		const reason = document.getElementById(button.getAttribute('aria-describedby')!);
		expect(reason).toBeVisible();
		expect(button).toHaveAccessibleDescription(
			'File attachments are not supported by the selected model',
		);
		expect(reason).toHaveTextContent('File attachments are not supported by the selected model');
		await userEvent.click(button);
		expect(emitted('attach')).toBeUndefined();
	});
});
