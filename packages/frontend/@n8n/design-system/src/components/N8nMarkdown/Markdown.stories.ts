import type { StoryFn } from '@storybook/vue3-vite';

import N8nMarkdown from './Markdown.vue';

export default {
	title: 'Atoms/Markdown',
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
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMarkdown,
	},
	template: '<n8n-markdown v-bind="args"></n8n-markdown>',
});

export const Markdown = Template.bind({});
Markdown.args = {
	content:
		'I wanted a system to monitor website content changes and notify me. So I made it using n8n.\n\nEspecially my competitor blogs. I wanted to know how often they are posting new articles. (I used their sitemap.xml file) (The below workflow may vary)\n\nIn the Below example, I used HackerNews for example.\n\nExplanation:\n\n- First HTTP Request node crawls the webpage and grabs the website source code\n- Then wait for x minutes\n- Again, HTTP Node crawls the webpage\n- If Node compares both results are equal if anything is changed. It’ll go to the false branch and notify me in telegram.\n\n**Workflow:**\n\n![](fileId:1)\n\n**Sample Response:**\n\n![](https://community.n8n.io/uploads/default/original/2X/d/d21ba41d7ac9ff5cd8148fedb07d0f1ff53b2529.png)\n',
	loading: false,
	images: [
		{
			id: 1,
			url: 'https://community.n8n.io/uploads/default/optimized/2X/b/b737a95de4dfe0825d50ca098171e9f33a459e74_2_690x288.png',
		},
	],
};

const TemplateWithCheckboxes: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMarkdown,
	},
	template: '<n8n-markdown v-bind="args"></n8n-markdown>',
});

export const WithCheckboxes = TemplateWithCheckboxes.bind({});
WithCheckboxes.args = {
	content: '__TODO__\n- [ ] Buy milk\n- [X] Buy socks\n',
	loading: false,
};

const TemplateWithYoutubeEmbed: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMarkdown,
	},
	template: '<n8n-markdown v-bind="args"></n8n-markdown>',
});

export const WithYoutubeEmbed = TemplateWithYoutubeEmbed.bind({});
WithYoutubeEmbed.args = {
	content:
		"## I'm markdown \n**Please check** this out. [Guide](https://docs.n8n.io/workflows/sticky-notes/)\n@[youtube](ZCuL2e4zC_4)\n",
	loading: false,
};
