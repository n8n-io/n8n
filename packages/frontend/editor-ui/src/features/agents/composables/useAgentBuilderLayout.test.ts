import { beforeEach, describe, expect, it } from 'vitest';
import { effectScope, ref } from 'vue';
import { useAgentBuilderLayout } from './useAgentBuilderLayout';

describe('useAgentBuilderLayout', () => {
	beforeEach(() => localStorage.clear());

	it.each([1224, 1384, 1864])('keeps the configuration at 440px in a %ipx container', (width) => {
		const scope = effectScope();
		scope.run(() => {
			const layout = useAgentBuilderLayout(ref(width));
			expect(layout.chatWidth.value).toBe(width - 440);
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
			expect(layout.chatWidth.value).toBe(460);
		});
		scope.stop();
	});

	it('clamps user resizes to the configuration limits', () => {
		const scope = effectScope();
		scope.run(() => {
			const layout = useAgentBuilderLayout(ref(1440));
			layout.resizeChat(1400);
			expect(layout.chatWidth.value).toBe(1080);
			layout.resizeChat(400);
			expect(layout.chatWidth.value).toBe(720);
			layout.resizeChat(layout.defaultChatWidth.value);
			expect(layout.chatWidth.value).toBe(1000);
		});
		scope.stop();
	});

	it('preserves a chosen width across temporary narrow layouts', () => {
		const scope = effectScope();
		scope.run(() => {
			const width = ref(1440);
			const layout = useAgentBuilderLayout(width);
			layout.resizeChat(800);
			width.value = 800;
			expect(layout.chatWidth.value).toBe(320);
			width.value = 375;
			expect(layout.compact.value).toBe(true);
			expect(layout.chatWidth.value).toBe(375);
			width.value = 1440;
			expect(layout.compact.value).toBe(false);
			expect(layout.chatWidth.value).toBe(800);
		});
		scope.stop();
	});
});
