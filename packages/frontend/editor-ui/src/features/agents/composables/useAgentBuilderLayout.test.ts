import { beforeEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useAgentBuilderLayout } from './useAgentBuilderLayout';

describe('useAgentBuilderLayout', () => {
	beforeEach(() => localStorage.clear());

	it.each([1200, 1440, 2400, 3440])('uses a 65/35 split in a %ipx workspace', (width) => {
		const scope = effectScope();
		scope.run(() => {
			const layout = useAgentBuilderLayout(ref(width));
			expect(layout.chatWidth.value).toBeCloseTo(width * 0.65);
		});
		scope.stop();
	});

	it('follows workspace size changes without saving a fixed width', () => {
		const scope = effectScope();
		scope.run(() => {
			const width = ref(1200);
			const layout = useAgentBuilderLayout(width);
			width.value = 2000;
			expect(layout.chatWidth.value).toBe(1300);
			width.value = 1200;
			expect(layout.chatWidth.value).toBe(780);
		});
		scope.stop();
	});

	it('ignores the previous fixed configuration width', () => {
		localStorage.setItem('N8N_AGENT_BUILDER_CONFIG_WIDTH', '440');
		const scope = effectScope();
		scope.run(() => {
			const layout = useAgentBuilderLayout(ref(1600));
			expect(layout.chatWidth.value).toBe(1040);
		});
		scope.stop();
	});

	it('keeps fullscreen mode while the host is narrow beside an open sidebar', () => {
		const scope = effectScope();
		scope.run(() => {
			const hostWidth = ref(600);
			const containerWidth = ref(900);
			const layout = useAgentBuilderLayout(containerWidth, hostWidth);
			expect(layout.compact.value).toBe(true);
			expect(layout.chatWidth.value).toBe(900);
			hostWidth.value = 900;
			expect(layout.compact.value).toBe(false);
			expect(layout.chatWidth.value).toBe(540);
		});
		scope.stop();
	});

	it('keeps both panels above their minimum widths', () => {
		const scope = effectScope();
		scope.run(() => {
			const layout = useAgentBuilderLayout(ref(1440));
			layout.resizeChat(1400);
			expect(layout.chatWidth.value).toBe(1080);
			layout.resizeChat(0);
			expect(layout.chatWidth.value).toBe(320);
			layout.resizeChat(layout.defaultChatWidth.value);
			expect(layout.chatWidth.value).toBe(936);
		});
		scope.stop();
	});

	it('preserves a chosen ratio across temporary narrow layouts', () => {
		const scope = effectScope();
		scope.run(() => {
			const width = ref(1600);
			const layout = useAgentBuilderLayout(width);
			layout.resizeChat(800);
			width.value = 680;
			expect(layout.chatWidth.value).toBe(320);
			width.value = 375;
			expect(layout.compact.value).toBe(true);
			expect(layout.chatWidth.value).toBe(375);
			width.value = 1600;
			expect(layout.compact.value).toBe(false);
			expect(layout.chatWidth.value).toBe(800);
		});
		scope.stop();
	});

	it('restores a saved resize as a ratio on a different workspace width', async () => {
		const scope = effectScope();
		scope.run(() => {
			const layout = useAgentBuilderLayout(ref(1600));
			layout.resizeChat(800);
		});
		await nextTick();
		scope.stop();

		const restoredScope = effectScope();
		restoredScope.run(() => {
			const layout = useAgentBuilderLayout(ref(2400));
			expect(layout.chatWidth.value).toBe(1200);
		});
		restoredScope.stop();
	});

	it('restores 65/35 after resetting in a workspace that limits the configuration width', () => {
		const scope = effectScope();
		scope.run(() => {
			const width = ref(900);
			const layout = useAgentBuilderLayout(width);
			layout.resizeChat(400);
			layout.resizeChat(layout.defaultChatWidth.value);
			expect(layout.chatWidth.value).toBe(540);
			width.value = 1600;
			expect(layout.chatWidth.value).toBe(1040);
		});
		scope.stop();
	});
});
