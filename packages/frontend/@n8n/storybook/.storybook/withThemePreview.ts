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

function themePreviewMinHeight(parameters: Record<string, unknown>): unknown {
	const themePreview = parameters.themePreview;
	if (typeof themePreview !== 'object' || themePreview === null || !('minHeight' in themePreview)) {
		return undefined;
	}
	return themePreview.minHeight;
}

function isTheme(value: string | undefined): value is Theme {
	return value === 'light' || value === 'dark';
}

export const withThemePreview: Decorator = (story, context) => {
	const minHeight = panelMinHeight(themePreviewMinHeight(context.parameters));

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
				const target = event.currentTarget;
				if (!(target instanceof HTMLElement)) {
					return;
				}
				const theme = target.dataset.theme;
				if (isTheme(theme)) {
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
