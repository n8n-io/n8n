import type { Decorator } from '@storybook/vue3';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { useChannel } from 'storybook/preview-api';
import { computed, ref, watch } from 'vue';

type Theme = 'light' | 'dark';
type ThemePreviewMode = Theme | 'side-by-side';

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

function isTheme(value: unknown): value is Theme {
	return value === 'light' || value === 'dark';
}

function isThemePreviewMode(value: unknown): value is ThemePreviewMode {
	return value === 'light' || value === 'dark' || value === 'side-by-side';
}

function resolveThemePreviewMode(value: unknown): ThemePreviewMode {
	return isThemePreviewMode(value) ? value : 'light';
}

export const withThemePreview: Decorator = (story, context) => {
	const minHeight = panelMinHeight(themePreviewMinHeight(context.parameters));
	const mode = ref<ThemePreviewMode>(resolveThemePreviewMode(context.globals.themePreview));

	// Vue 3 on Storybook 10.1 does not remount decorators when toolbar globals change.
	// Keep a local ref in sync via the preview channel so the canvas updates immediately.
	useChannel({
		[GLOBALS_UPDATED]: ({ globals }: { globals: Record<string, unknown> }) => {
			mode.value = resolveThemePreviewMode(globals.themePreview);
		},
	});

	return {
		components: { storyComponent: story() },
		setup() {
			const sideBySide = computed(() => mode.value === 'side-by-side');
			const panelStyle = minHeight ? { minHeight } : undefined;

			watch(
				mode,
				(next) => {
					applyBodyTheme(next === 'side-by-side' ? 'light' : next);
				},
				{ immediate: true },
			);

			function onPanelInteract(event: Event) {
				const target = event.currentTarget;
				if (!(target instanceof HTMLElement)) {
					return;
				}
				const panelTheme = target.dataset.theme;
				if (isTheme(panelTheme)) {
					applyBodyTheme(panelTheme);
				}
			}

			return {
				panelStyle,
				sideBySide,
				onPanelInteract,
			};
		},
		unmounted() {
			document.body.removeAttribute('data-theme');
			document.body.style.removeProperty('color-scheme');
		},
		template: `
			<div v-if="sideBySide" class="theme-side-by-side">
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
			<storyComponent v-else />
		`,
	};
};
