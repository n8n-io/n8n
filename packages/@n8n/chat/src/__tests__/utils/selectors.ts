import { screen } from '@testing-library/vue';
import { defaultMountingTarget } from '@n8n/chat/constants';

export function getMountingTarget(target = defaultMountingTarget) {
	return document.querySelector(target);
}

export function getChatWindowWrapper() {
	return document.querySelector('.chat-window-wrapper');
}

export function getChatWindowToggle() {
	return document.querySelector('.chat-window-toggle');
}

export function getChatWrapper() {
	return document.querySelector('.chat-wrapper');
}

export function getChatMessages() {
	return document.querySelectorAll('.chat-message:not(.chat-message-typing)');
}

export function getChatMessage(index: number) {
	const messages = getChatMessages();
	return index < 0 ? messages[messages.length + index] : messages[index];
}

export function getChatMessageByText(text: string) {
	return screen.queryByText(text, {
		selector: '.chat-message:not(.chat-message-typing) .chat-message-markdown p',
	});
}

export function getChatMessageTyping() {
	return document.querySelector('.chat-message-typing');
}

export function getGetStartedButton() {
	return document.querySelector('.chat-get-started .chat-button');
}

export function getChatInput() {
	return document.querySelector('.chat-input');
}

export function getChatInputTextarea() {
	return document.querySelector('.chat-input textarea');
}

export function getChatInputSendButton() {
	return document.querySelector('.chat-input .chat-input-send-button');
}
