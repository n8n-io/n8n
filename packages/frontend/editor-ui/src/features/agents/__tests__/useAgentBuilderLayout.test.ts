import { useAgentBuilderLayout } from '../composables/useAgentBuilderLayout';

describe('useAgentBuilderLayout', () => {
	const chatCollapsedKey = 'agentBuilder.chatColumnCollapsed';
	const chatWidthKey = 'agentBuilder.chatColumnWidth';

	beforeEach(() => {
		window.localStorage.removeItem(chatCollapsedKey);
		window.localStorage.removeItem(chatWidthKey);
	});

	it('reserves chat width while collapsed so expanding restores the stored width', () => {
		window.localStorage.setItem(chatCollapsedKey, '1');
		window.localStorage.setItem(chatWidthKey, '460');

		const layout = useAgentBuilderLayout();

		expect(layout.chatColumnCollapsed.value).toBe(true);
		expect(layout.chatColumnWidth.value).toBe(320);

		layout.chatColumnCollapsed.value = false;

		expect(layout.chatColumnCollapsed.value).toBe(false);
		expect(layout.chatColumnWidth.value).toBe(460);
	});

	it('clamps chat resize events to the minimum width', () => {
		const layout = useAgentBuilderLayout();

		layout.onChatColumnResize({ width: 280 });

		expect(layout.chatColumnCollapsed.value).toBe(false);
		expect(layout.chatColumnWidth.value).toBe(320);
	});

	it('clamps chat resize events to preserve the minimum editor width', () => {
		const layout = useAgentBuilderLayout();
		layout.builderRef.value = { offsetWidth: 1000 } as HTMLElement;

		layout.onChatColumnResize({ width: 900 });

		expect(layout.chatColumnCollapsed.value).toBe(false);
		expect(layout.chatColumnWidth.value).toBe(580);
	});
});
