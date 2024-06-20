import { createChat } from '@n8n/chat/index';

export function createTestChat(options: Parameters<typeof createChat>[0] = {}): {
	unmount: () => void;
	container: Element;
} {
	const app = createChat(options);

	const container = app._container as Element;
	const unmount = () => app.unmount();

	return {
		unmount,
		container,
	};
}
