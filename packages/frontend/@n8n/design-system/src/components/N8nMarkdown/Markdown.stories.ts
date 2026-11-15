import type { StoryFn } from '@storybook/vue3-vite';

import N8nMarkdown from './Markdown.vue';
import N8nCodeBlock from '../N8nCodeBlock';
import N8nIcon from '../N8nIcon';

/** Show icons for same-origin workflow paths and leave other links unchanged. */
export const LinkSlot: StoryFn = (args) => ({
	components: { N8nMarkdown, N8nIcon },
	setup() {
		const pathIcons: Record<string, InstanceType<typeof N8nIcon>['$props']['icon']> = {
			'/workflow': 'workflow',
		};

		function getLinkIcon(href: string) {
			try {
				const url = new URL(href, window.location.origin);
				if (url.origin !== window.location.origin) return undefined;

				for (const [path, icon] of Object.entries(pathIcons)) {
					if (url.pathname === path || url.pathname.startsWith(`${path}/`)) return icon;
				}
			} catch {
				return undefined;
			}
			return undefined;
		}

		return { args, getLinkIcon };
	},
	template: `
		<N8nMarkdown v-bind="args">
			<template #link="link">
				<a :href="link.href" :title="link.title" :target="link.target" :rel="link.rel">
					<N8nIcon v-if="getLinkIcon(link.href)" :icon="getLinkIcon(link.href)" aria-hidden="true" />
					{{ link.label }}
				</a>
			</template>
		</N8nMarkdown>
	`,
});

LinkSlot.args = {
	content: [
		'## Custom links',
		'Open [My workflow](/workflow/123 "Open workflow") to edit it.',
		'',
		'- [Workflow root](/workflow) also shows an icon.',
		'- [Workflow list](/workflows) does not match the path.',
		'- [External workflow](https://example.com/workflow/123) stays a normal link.',
		'- [Documentation](https://docs.n8n.io) stays a normal link.',
	].join('\n'),
};

export default {
	title: 'Core/Markdown',
	component: N8nMarkdown,
	argTypes: {
		content: {
			control: {
				type: 'text',
			},
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
		loadingBlocks: {
			control: {
				type: 'select',
			},
			options: [1, 2, 3, 4, 5],
		},
		loadingRows: {
			control: {
				type: 'select',
			},
			options: [1, 2, 3, 4, 5],
		},
	},

	parameters: {
		docs: {
			description: {
				component: 'A renderer for Markdown content with n8n-compatible formatting behavior.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMarkdown,
	},
	template: '<n8n-markdown v-bind="args"></n8n-markdown>',
});

export const Default = Template.bind({});
Default.args = {
	content:
		'I wanted a system to monitor website content changes and notify me. So I made it using n8n.\n\nEspecially my competitor blogs. I wanted to know how often they are posting new articles. (I used their sitemap.xml file) (The below workflow may vary)\n\nIn the Below example, I used HackerNews for example.\n\nExplanation:\n\n- First HTTP Request node crawls the webpage and grabs the website source code\n- Then wait for x minutes\n- Again, HTTP Node crawls the webpage\n- If Node compares both results are equal if anything is changed. It’ll go to the false branch and notify me in telegram.\n\n**Workflow:**\n\n![](fileId:1)\n\n**Sample Response:**\n\n![](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)\n',
	loading: false,
	images: [
		{
			id: 1,
			url: 'https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot.png',
		},
	],
};

/** Show Markdown and GFM elements with a Vue component for fenced code. */
export const GfmWithCustomComponents: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { N8nMarkdown, N8nCodeBlock },
	template: `
		<N8nMarkdown v-bind="args">
			<template #code-block="{ code, language }">
				<N8nCodeBlock :code="code" :language="language || 'auto'" />
			</template>
		</N8nMarkdown>
	`,
});

GfmWithCustomComponents.args = {
	content: [
		'# Heading 1',
		'## Heading 2',
		'### Heading 3',
		'#### Heading 4',
		'##### Heading 5',
		'###### Heading 6',
		'',
		'## Paragraphs and line breaks',
		'This is a paragraph with a line break.  ',
		'This line stays in the same paragraph.',
		'',
		'This is a separate paragraph.',
		'',
		'## Inline formatting',
		'Use **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and `inline code`.',
		'Escaped punctuation: \\*plain text\\*. An entity: &amp;.',
		'',
		'## Links and autolinks',
		'[Inline link](https://docs.n8n.io "n8n documentation") and [reference link][docs].',
		'',
		'<https://docs.n8n.io> and <builder@example.com>.',
		'',
		'GFM autolinks: https://docs.n8n.io and www.example.com.',
		'',
		'[docs]: https://docs.n8n.io',
		'',
		'## Images',
		'![Workflow editor](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png "Workflow editor")',
		'',
		'## Blockquotes',
		'> A blockquote with **bold text**.',
		'>',
		'> > A nested blockquote.',
		'',
		'## Unordered lists',
		'- First item',
		'- Second item',
		'  - Nested item',
		'',
		'## Ordered lists',
		'1. First step',
		'2. Second step',
		'   1. Nested step',
		'',
		'## Task lists',
		'- [x] Read the input',
		'- [ ] Transform the data',
		'- [ ] Send the output',
		'',
		'## Tables',
		'| Left | Center | Right |',
		'| :--- | :---: | ---: |',
		'| **Bold** | `code` | 42 |',
		'| [Link](https://docs.n8n.io) | Plain text | 100 |',
		'',
		'## Thematic break',
		'',
		'---',
		'',
		'## Fenced code with custom components',
		'```typescript',
		'function greet(name: string) {',
		'  return "Hello, " + name;',
		'}',
		'```',
		'',
		'```json',
		'{ "enabled": true, "items": [1, 2, 3] }',
		'```',
		'',
		'```',
		'Code without a language uses automatic detection.',
		'```',
		'',
		'### Code inside a list',
		'- Run this command:',
		'',
		'  ```bash',
		'  echo "Hello world"',
		'  ```',
		'',
		'### Code inside a blockquote',
		'> ```python',
		'> print("Hello world")',
		'> ```',
		'',
		'## Indented code',
		'',
		'    Indented code keeps the default Markdown renderer.',
		'',
		'## Raw HTML',
		'Raw HTML is disabled. These tags must appear as text:',
		'',
		'<strong>Not rendered as HTML</strong>',
	].join('\n'),
	loading: false,
};
