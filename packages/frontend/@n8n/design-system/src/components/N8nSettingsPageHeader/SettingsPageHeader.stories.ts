import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nExternalLink from '../N8nExternalLink';
import N8nText from '../N8nText';
import N8nSettingsPageHeader from './SettingsPageHeader.vue';

const meta = {
	title: 'Areas/Settings/PageHeader',
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
					'Page title with an optional 1-2 sentence description and an inline documentation link. The docs link is ON by default (`show-docs-link`), so every settings page links to docs — set `:show-docs-link="false"` to remove it, and provide `docs-url` so the link points somewhere (a dev warning fires if it is enabled without a URL). The header always caps itself at the content max-width (`--settings-content--max-width`, 45rem / 720px). The link is an inline `N8nExternalLink` at the end of the description, sized to the description text: the word is underlined, the trailing external-link icon is not, and hovering shows the component\'s pill without moving the surrounding copy. Pages that need several links in the description can use the `description` slot with the same `<N8nExternalLink inline size="small">` and get the identical treatment.',
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

/**
 * A description that needs several links: turn the built-in docs link off and compose the
 * sentence in the `description` slot with the same inline `N8nExternalLink` the header uses.
 */
export const DescriptionWithLinks: Story = {
	render: (args) => ({
		components: { N8nSettingsPageHeader, N8nText, N8nExternalLink },
		setup: () => ({ args }),
		template: frame(`
			<N8nSettingsPageHeader v-bind="args">
				<template #description>
					<N8nText size="medium" color="text-base">
						Use your API key to control n8n programmatically. Try it in the
						<N8nExternalLink inline size="small" href="https://docs.n8n.io/api/api-playground/">API playground</N8nExternalLink>,
						or use the
						<N8nExternalLink inline size="small" href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/">Webhook node</N8nExternalLink>
						if you only need to trigger workflows. You can learn more in the
						<N8nExternalLink inline size="small" href="https://docs.n8n.io/api/">documentation</N8nExternalLink>.
					</N8nText>
				</template>
			</N8nSettingsPageHeader>
		`),
	}),
	args: {
		title: 'API keys',
		showDocsLink: false,
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
