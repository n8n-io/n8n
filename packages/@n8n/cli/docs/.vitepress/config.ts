import { defineConfig } from 'vitepress';

export default defineConfig({
	title: 'n8n CLI',
	description:
		'Client CLI for n8n — manage workflows, executions, and credentials from the terminal',
	themeConfig: {
		nav: [
			{ text: 'Getting Started', link: '/getting-started' },
			{ text: 'Commands', link: '/commands/workflow' },
			{ text: 'Guides', link: '/guides/ai-agents' },
		],
		sidebar: [
			{
				text: 'Introduction',
				items: [
					{ text: 'Overview', link: '/' },
					{ text: 'Getting Started', link: '/getting-started' },
				],
			},
			{
				text: 'Commands',
				items: [
					{ text: 'config', link: '/commands/config' },
					{ text: 'workflow', link: '/commands/workflow' },
					{ text: 'execution', link: '/commands/execution' },
					{ text: 'credential', link: '/commands/credential' },
					{ text: 'tag', link: '/commands/tag' },
					{ text: 'project', link: '/commands/project' },
					{ text: 'variable', link: '/commands/variable' },
					{ text: 'data-table', link: '/commands/data-table' },
					{ text: 'user', link: '/commands/user' },
					{ text: 'source-control', link: '/commands/source-control' },
					{ text: 'audit', link: '/commands/audit' },
				],
			},
			{
				text: 'Guides',
				items: [
					{ text: 'AI Agents', link: '/guides/ai-agents' },
					{ text: 'CI/CD', link: '/guides/ci-cd' },
				],
			},
		],
		socialLinks: [{ icon: 'github', link: 'https://github.com/n8n-io/n8n' }],
	},
});
