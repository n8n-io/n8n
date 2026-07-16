import type { Decorator } from '@storybook/vue3';

export const withThemePreview: Decorator = (story) => {
	return {
		components: { StoryComponent: story() },
		template: `
			<div class="theme-side-by-side">
				<section class="theme-side-by-side__panel" data-theme="light">
					<StoryComponent />
				</section>
				<section class="theme-side-by-side__panel" data-theme="dark">
					<StoryComponent />
				</section>
			</div>
		`,
	};
};
