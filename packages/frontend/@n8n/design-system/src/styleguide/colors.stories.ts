import { type StoryFn } from '@storybook/vue3-vite';

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
	"<color-circles :colors=\"['--color--primary--shade-1', '--color--primary', '--color--primary--tint-1', '--color--primary--tint-2', '--color--primary--tint-3']\" />",
);

export const Secondary = Template(
	"<color-circles :colors=\"['--color--secondary--shade-1', '--color--secondary', '--color--secondary--tint-1', '--color--secondary--tint-2']\" />",
);

export const Success = Template(
	"<color-circles :colors=\"['--color--success--shade-1', '--color--success', '--color--success--tint-1',  '--color--success--tint-2', '--color--success--tint-3', '--color--success--tint-4']\" />",
);

export const Warning = Template(
	"<color-circles :colors=\"['--color--warning--shade-1', '--color--warning', '--color--warning--tint-1', '--color--warning--tint-2']\" />",
);

export const Danger = Template(
	"<color-circles :colors=\"['--color--danger--shade-1', '--color--danger', '--color--danger--tint-1', '--color--danger--tint-2', '--color--danger--tint-3', '--color--danger--tint-4']\" />",
);

export const Text = Template(
	"<color-circles :colors=\"['--color--text--shade-1', '--color--text', '--color--text--tint-1', '--color--text--tint-2', '--color--text--tint-3', '--color--text--danger']\" />",
);

export const Foreground = Template(
	"<color-circles :colors=\"['--color--foreground--shade-2', '--color--foreground--shade-1', '--color--foreground', '--color--foreground--tint-1', '--color--foreground--tint-2']\" />",
);

export const Background = Template(
	"<color-circles :colors=\"['--color--background--shade-2', '--color--background--shade-1', '--color--background', '--color--background--light-1', '--color--background--light-2', '--color--background--light-3']\" />",
);
