import { describe, it, expect } from 'vitest';
import { nextTick, ref, shallowRef } from 'vue';

import { useArtifactsPanelToggle } from '../useArtifactsLayout';

function setup(options: { inLayout?: boolean; canRevealOverPreview?: boolean } = {}) {
	const isInLayout = ref(options.inLayout ?? true);
	const isPreviewVisible = ref(false);
	const toggle = useArtifactsPanelToggle({
		isInLayout: () => isInLayout.value,
		canShow: () => true,
		isPreviewVisible: () => isPreviewVisible.value,
		canRevealOverPreview: options.canRevealOverPreview,
		panelSlot: shallowRef(null),
		toggleSelector: '[data-test-id="toggle"]',
	});
	return { ...toggle, isInLayout, isPreviewVisible };
}

describe('useArtifactsPanelToggle', () => {
	it('keeps the panel beside the chat in a wide view until the user hides it', () => {
		const { showArtifactsPanel, toggleArtifactsPanel } = setup();
		expect(showArtifactsPanel.value).toBe(true);

		toggleArtifactsPanel();
		expect(showArtifactsPanel.value).toBe(false);
	});

	it('hides the panel and ignores the toggle while the preview is open', async () => {
		const { showArtifactsPanel, toggleArtifactsPanel, isPreviewVisible } = setup();
		isPreviewVisible.value = true;
		await nextTick();

		toggleArtifactsPanel();
		expect(showArtifactsPanel.value).toBe(false);
	});

	describe('with canRevealOverPreview', () => {
		it('shows the panel over the chat on request while the preview is open', async () => {
			const { showArtifactsPanel, toggleArtifactsPanel, isPreviewVisible } = setup({
				canRevealOverPreview: true,
			});
			isPreviewVisible.value = true;
			await nextTick();
			expect(showArtifactsPanel.value).toBe(false);

			toggleArtifactsPanel();
			expect(showArtifactsPanel.value).toBe(true);

			toggleArtifactsPanel();
			expect(showArtifactsPanel.value).toBe(false);
		});

		it('closes the panel over the chat when the preview closes, and keeps the pinned panel', async () => {
			const { showArtifactsPanel, toggleArtifactsPanel, isPreviewVisible, isInLayout } = setup({
				canRevealOverPreview: true,
			});
			isPreviewVisible.value = true;
			await nextTick();
			toggleArtifactsPanel();

			isPreviewVisible.value = false;
			await nextTick();
			// The wide view shows the pinned panel again.
			expect(showArtifactsPanel.value).toBe(true);

			isInLayout.value = false;
			await nextTick();
			expect(showArtifactsPanel.value).toBe(false);
		});

		it('closes only the panel over the chat on request', async () => {
			const {
				showArtifactsPanel,
				toggleArtifactsPanel,
				closeArtifactsPanelOverChat,
				isPreviewVisible,
			} = setup({ canRevealOverPreview: true });
			closeArtifactsPanelOverChat();
			expect(showArtifactsPanel.value).toBe(true);

			isPreviewVisible.value = true;
			await nextTick();
			toggleArtifactsPanel();
			closeArtifactsPanelOverChat();
			expect(showArtifactsPanel.value).toBe(false);
		});
	});
});
