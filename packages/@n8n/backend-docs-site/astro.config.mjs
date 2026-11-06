// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig, passthroughImageService } from 'astro/config';
import { readdirSync } from 'node:fs';
import { remarkBackendDocs } from './plugins/remark-backend-docs.mjs';

// The reading order from docs/backend/README.md. Pages missing here are appended alphabetically.
const DAY_ONE = ['index', 'how-n8n-runs'];
const TIER_TWO = [
	'workflow-publication',
	'workflow-execution',
	'agent-turn',
];
// Month 1 pages in reading order: workflows, agents, processes, state, then the product around them.
const SUBSYSTEMS = [
	'engine',
	'triggers',
	'user-code',
	'ai-features',
	'clusters',
	'live-updates',
	'data',
	'observability',
	'access',
	'licensing',
	'cloud',
	'public-api',
	'product-features',
	'engine-2',
];

const DOCS_DIR = new URL('../../../docs/backend/', import.meta.url);

/** Lists the page slugs in a docs folder, known order first, then the rest alphabetically. */
function pages(known, folder = '') {
	const found = readdirSync(new URL(folder, DOCS_DIR))
		.filter((name) => name.endsWith('.md') && name !== 'README.md')
		.map((name) => name.slice(0, -3))
		.sort();
	const ordered = [...known.filter((slug) => found.includes(slug)), ...found.filter((slug) => !known.includes(slug))];
	return ordered.map((slug) => ({ slug: `${folder}${slug}` }));
}

export default defineConfig({
	// The toolbar covers page content in screenshots and reviews.
	devToolbar: { enabled: false },
	image: { service: passthroughImageService() },
	// Keep the text as written. Smartypants would turn quotes and dots into typographic variants.
	markdown: {
		smartypants: false,
		remarkPlugins: [remarkBackendDocs],
		shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
	},
	integrations: [
		starlight({
			title: 'n8n backend onboarding',
			favicon: '/favicon.svg',
			description: 'Onboarding documents for the n8n backend, rendered from docs/backend.',
			customCss: ['./src/styles/custom.css'],
			components: {
				Head: './src/components/Head.astro',
				PageTitle: './src/components/PageTitle.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			// Expressive Code links a stylesheet name that the build does not write (Astro 7,
			// astro-expressive-code 0.44), so code blocks had no styles. Astro's own Shiki output is used instead.
			expressiveCode: false,
			sidebar: [
				{ label: 'Day 1', items: DAY_ONE.map((slug) => ({ slug })) },
				{
					label: 'Week 1',
					items: pages(TIER_TWO).filter((item) => !DAY_ONE.includes(item.slug)),
				},
				{ label: 'Month 1', collapsed: true, items: pages(SUBSYSTEMS, 'subsystems/') },
				{ label: 'How to', items: pages(['run-queue-mode-locally', 'build-a-backend-module', 'write-a-database-migration', 'roll-out-a-change'], 'how-to/') },
			],
		}),
	],
});
