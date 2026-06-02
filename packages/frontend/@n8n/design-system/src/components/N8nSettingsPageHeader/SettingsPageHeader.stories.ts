import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nSettingsPageHeader from './SettingsPageHeader.vue';

const meta = {
	title: 'Instance Settings/Page Header',
	component: N8nSettingsPageHeader,
	parameters: {
		docs: {
			description: {
				component:
					'Page title with an optional 1-2 sentence description and an optional inline documentation link. The header always caps itself at the content max-width (`--settings-content--max-width`, 45rem / 720px), independent of its container. The documentation link renders inline at the end of the description, in the description base color: the word is underlined and the trailing `↗` is not.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsPageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wider than 720px to show the header capping itself at the content max-width.
const frame = (inner: string) => `<div style="max-width: 60rem;">${inner}</div>`;

export const Default: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader },
		setup: () => ({ args }),
		template: frame('<N8nSettingsPageHeader v-bind="args" />'),
	}),
	args: {
		title: 'This instance',
		description:
			'Plan, usage, version, updates, instance details, resources, and support for this n8n instance.',
	},
};

export const WithDocsLink: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader },
		setup: () => ({ args }),
		template: frame('<N8nSettingsPageHeader v-bind="args" />'),
	}),
	args: {
		title: 'This instance',
		description:
			'Plan, usage, version, updates, instance details, resources, and support. Licensing',
		docsLabel: 'documentation',
		docsHref: 'https://docs.n8n.io',
	},
};

export const DescriptionOnly: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader },
		setup: () => ({ args }),
		template: frame('<N8nSettingsPageHeader v-bind="args" />'),
	}),
	args: {
		title: 'Security & login',
		description: 'Your 2FA setup, passkeys, active sessions, and authorized OAuth applications.',
	},
};

export const TitleOnly: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader },
		setup: () => ({ args }),
		template: frame('<N8nSettingsPageHeader v-bind="args" />'),
	}),
	args: {
		title: 'Members',
	},
};

export const LongDescription: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader },
		setup: () => ({ args }),
		template: frame('<N8nSettingsPageHeader v-bind="args" />'),
	}),
	args: {
		title: 'Page title',
		description:
			'Description of the page explaining what it does, followed up by a link to full feature documentation as the next sentence. It should not be overly long, rather 1-2 sentences. You can learn more in the',
		docsLabel: 'documentation',
		docsHref: 'https://docs.n8n.io',
	},
};
