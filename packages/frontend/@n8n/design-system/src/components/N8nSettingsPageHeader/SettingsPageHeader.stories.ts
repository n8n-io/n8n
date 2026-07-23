import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nSettingsPageHeader from './SettingsPageHeader.vue';

const meta = {
	title: 'Instance Settings/Page Header',
	component: N8nSettingsPageHeader,
	argTypes: {
		showDocsLink: { control: 'boolean' },
		docsUrl: { control: 'text' },
		docsLabel: { control: 'text' },
		docsLeadingText: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Page title with an optional 1-2 sentence description and an inline documentation link. The docs link is ON by default (`show-docs-link`), so every settings page links to docs — set `:show-docs-link="false"` to remove it, and provide `docs-url` so the link points somewhere (a dev warning fires if it is enabled without a URL). The header always caps itself at the content max-width (`--settings-content--max-width`, 45rem / 720px). The link renders inline at the end of the description in the description base color: the word is underlined and the trailing `↗` is not.',
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
		docsUrl: 'https://docs.n8n.io',
	},
};

export const CustomLeadingCopy: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader },
		setup: () => ({ args }),
		template: frame('<N8nSettingsPageHeader v-bind="args" />'),
	}),
	args: {
		title: 'API keys',
		description: 'Use your API keys to control n8n programmatically.',
		docsLeadingText: 'Read the ',
		docsLabel: 'API reference',
		docsUrl: 'https://docs.n8n.io/api/',
	},
};

export const WithoutDocsLink: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader },
		setup: () => ({ args }),
		template: frame('<N8nSettingsPageHeader v-bind="args" />'),
	}),
	args: {
		title: 'Members',
		description: 'People with access to this instance.',
		showDocsLink: false,
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
		showDocsLink: false,
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
			'Description of the page explaining what it does, followed up by a link to full feature documentation as the next sentence. It should not be overly long, rather 1-2 sentences.',
		docsUrl: 'https://docs.n8n.io',
	},
};
