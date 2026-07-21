import type { Decorator } from '@storybook/vue3';

type Theme = 'light' | 'dark';

let activeTheme: Theme = 'light';
let observer: MutationObserver | undefined;
let listenerCount = 0;

function stamp(node: Node) {
	if (!(node instanceof HTMLElement)) {
		return;
	}
	// Skip the story tree, and anything already inside a stamped portal
	if (node.closest('#storybook-root') || node.closest('[data-theme]')) {
		return;
	}

	node.setAttribute('data-theme', activeTheme);
	node.style.colorScheme = activeTheme;
}

function onPanelInteract(event: Event) {
	const theme = (event.currentTarget as HTMLElement).dataset.theme;
	if (theme === 'light' || theme === 'dark') {
		activeTheme = theme;
	}
}

/**
 * Portalled overlays render under `document.body`, outside the themed panels.
 * Remember the last panel interacted with and stamp that theme onto each new
 * portal once — never overwrite, so both panels can stay open independently.
 */
export const withThemePreview: Decorator = (story) => ({
	components: { storyComponent: story() },
	mounted() {
		listenerCount += 1;
		if (!observer) {
			observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					for (const node of mutation.addedNodes) {
						stamp(node);
					}
				}
			});
			observer.observe(document.body, { childList: true });
		}
	},
	unmounted() {
		listenerCount -= 1;
		if (listenerCount === 0 && observer) {
			observer.disconnect();
			observer = undefined;
			activeTheme = 'light';
		}
	},
	methods: { onPanelInteract },
	template: `
		<div class="theme-side-by-side">
			<section
				class="theme-side-by-side__panel"
				data-theme="light"
				@pointerenter="onPanelInteract"
				@pointerdown.capture="onPanelInteract"
			>
				<storyComponent />
			</section>
			<section
				class="theme-side-by-side__panel"
				data-theme="dark"
				@pointerenter="onPanelInteract"
				@pointerdown.capture="onPanelInteract"
			>
				<storyComponent />
			</section>
		</div>
	`,
});
