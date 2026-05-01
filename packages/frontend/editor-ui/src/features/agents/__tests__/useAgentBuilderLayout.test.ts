import { nextTick } from 'vue';
import { useAgentBuilderLayout } from '../composables/useAgentBuilderLayout';

describe('useAgentBuilderLayout', () => {
	const chatCollapsedKey = 'agentBuilder.chatColumnCollapsed';
	const chatWidthKey = 'agentBuilder.chatColumnWidth';

	let container: HTMLElement;

	beforeEach(() => {
		window.localStorage.removeItem(chatCollapsedKey);
		window.localStorage.removeItem(chatWidthKey);

		container = document.createElement('div');
		Object.defineProperty(container, 'offsetWidth', {
			configurable: true,
			get() {
				return 1200;
			},
		});
	});

	it('reserves chat width while collapsed so expanding keeps the editor above minimum width', async () => {
		window.localStorage.setItem(chatCollapsedKey, '1');
		window.localStorage.setItem(chatWidthKey, '460');

		const layout = useAgentBuilderLayout();
		layout.builderRef.value = container;
		await nextTick();

		expect(layout.chatColumnCollapsed.value).toBe(true);
		expect(layout.chatColumnWidth.value).toBe(320);

		layout.onToggleChatColumn();
		await nextTick();

		expect(layout.chatColumnCollapsed.value).toBe(false);
		expect(layout.gridColumns.value).toBe('460px minmax(420px, 1fr)');
	});
});
