import type { Decorator } from '@storybook/vue3';

type Theme = 'light' | 'dark';

function applyBodyTheme(theme: Theme) {
	document.body.dataset.theme = theme;
	document.body.style.colorScheme = theme;
}

function panelMinHeight(value: unknown): string | undefined {
	if (typeof value === 'number') {
		return `${value}px`;
	}
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	return undefined;
}

/**
 * Portalled overlays render under `document.body`, outside the themed panels.
 * Mirror the active panel's theme onto `body` so those overlays pick up the
 * correct CSS variables.
 *
 * Opt into taller panels per story with:
 * `parameters: { themePreview: { minHeight: 480 } }`
 */
export const withThemePreview: Decorator = (story, context) => {
	const minHeight = panelMinHeight(
		(context.parameters.themePreview as { minHeight?: number | string } | undefined)?.minHeight,
	);

	return {
		components: { storyComponent: story() },
		setup: () => ({
			panelStyle: minHeight ? { minHeight } : undefined,
		}),
		mounted() {
			applyBodyTheme('light');
		},
		unmounted() {
			document.body.removeAttribute('data-theme');
			document.body.style.removeProperty('color-scheme');
		},
		methods: {
			onPanelInteract(event: Event) {
				const theme = (event.currentTarget as HTMLElement).dataset.theme;
				if (theme === 'light' || theme === 'dark') {
					applyBodyTheme(theme);
				}
			},
		},
		template: `
			<div class="theme-side-by-side">
				<section
					class="theme-side-by-side__panel"
					:style="panelStyle"
					data-theme="light"
					@pointerenter="onPanelInteract"
					@pointerdown.capture="onPanelInteract"
				>
					<storyComponent />
				</section>
				<section
					class="theme-side-by-side__panel"
					:style="panelStyle"
					data-theme="dark"
					@pointerenter="onPanelInteract"
					@pointerdown.capture="onPanelInteract"
				>
					<storyComponent />
				</section>
			</div>
		`,
	};
};
