import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ChatPromptCompact from './ChatPromptCompact.vue';
import ChatPromptFull from './ChatPromptFull.vue';

describe.each([
	['compact', createComponentRenderer(ChatPromptCompact)],
	['full', createComponentRenderer(ChatPromptFull)],
] as const)('ChatPrompt %s', (_layout, renderComponent) => {
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
