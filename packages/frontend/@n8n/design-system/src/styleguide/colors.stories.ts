import { type StoryFn } from '@storybook/vue3';

import ColorCircles from './ColorCircles.vue';

export default {
	title: 'Styleguide/Colors Tokens',
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/DxLbnIyMK8X0uLkUguFV4n/n8n-design-system_v1?node-id=2%3A23',
		},
	},
};

const Template =
	(template: string): StoryFn =>
	() => ({
		components: {
			ColorCircles,
		},
		template,
	});

export const Primary = Template(
	"<color-circles :colors=\"['--color-primary-shade-1', '--color-primary', '--color-primary-tint-1', '--color-primary-tint-2', '--color-primary-tint-3']\" />",
);

export const Secondary = Template(
	"<color-circles :colors=\"['--color-secondary-shade-1', '--color-secondary', '--color-secondary-tint-1', '--color-secondary-tint-3']\" />",
);

export const Success = Template(
	"<color-circles :colors=\"['--color-success-shade-1', '--color-success', '--color-success-light',  '--color-success-light-2', '--color-success-tint-1', '--color-success-tint-2']\" />",
);

export const Warning = Template(
	"<color-circles :colors=\"['--color-warning-shade-1', '--color-warning', '--color-warning-tint-1', '--color-warning-tint-2']\" />",
);

export const Danger = Template(
	"<color-circles :colors=\"['--color-danger-shade-1', '--color-danger', '--color-danger-tint-1', '--color-danger-tint-2']\" />",
);

export const Text = Template(
	"<color-circles :colors=\"['--color-text-dark', '--color-text-base', '--color-text-light', '--color-text-lighter', '--color-text-xlight', '--color-text-danger']\" />",
);

export const Foreground = Template(
	"<color-circles :colors=\"['--color-foreground-xdark', '--color-foreground-dark', '--color-foreground-base', '--color-foreground-light', '--color-foreground-xlight']\" />",
);

export const Background = Template(
	"<color-circles :colors=\"['--color-background-dark', '--color-background-medium', '--color-background-base', '--color-background-light', '--color-background-xlight']\" />",
);
