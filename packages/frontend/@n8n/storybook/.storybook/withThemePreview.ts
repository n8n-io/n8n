import type { Decorator } from '@storybook/vue3';

export const withThemePreview: Decorator = (story) => {
	return {
		components: { storyComponent: story() },
		template: `
			<div class="theme-side-by-side">
				<section class="theme-side-by-side__panel" data-theme="light">
					<storyComponent />
				</section>
				<section class="theme-side-by-side__panel" data-theme="dark">
					<storyComponent />
				</section>
			</div>
		`,
	};
};
