// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig, passthroughImageService } from 'astro/config';
import { readdirSync } from 'node:fs';
import { remarkBackendDocs } from './plugins/remark-backend-docs.mjs';

// The reading order from docs/backend/README.md.
const DAY_ONE = ['index', 'how-n8n-runs'];
const TIER_TWO = [
	'workflow-publication',
	'workflow-execution',
	'agent-publication',
	'agent-turn',
];
// Month 1 pages in reading order, in groups. The build fails when a page is in no group.
const MONTH_ONE = [
	{ label: 'Processes', slugs: ['lifecycle', 'coordination', 'persistence', 'sandboxing', 'observability'] },
	{ label: 'Requests', slugs: ['apis', 'authentication', 'permissions', 'credentials'] },
	{ label: 'Features', slugs: ['licensing', 'governance', 'ai-for-building', 'ai-context', 'ai-evals'] },
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

/** Builds the Month 1 groups, and fails when a top-level page is in no tier. */
function monthOneGroups() {
	const found = pages([])
		.map((item) => item.slug)
		.filter((slug) => !DAY_ONE.includes(slug) && !TIER_TWO.includes(slug));
	const grouped = MONTH_ONE.flatMap((group) => group.slugs);
	const missing = found.filter((slug) => !grouped.includes(slug));
	if (missing.length > 0) {
		throw new Error(`Add these pages to DAY_ONE, TIER_TWO, or a group in MONTH_ONE: ${missing.join(', ')}`);
	}
	return MONTH_ONE.map((group) => ({
		label: group.label,
		items: group.slugs.filter((slug) => found.includes(slug)).map((slug) => ({ slug })),
	}));
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
					items: TIER_TWO.map((slug) => ({ slug })),
				},
				{ label: 'Month 1', collapsed: true, items: monthOneGroups() },
				{ label: 'How to', items: pages(['run-queue-mode-locally', 'build-a-backend-module', 'write-a-database-migration', 'test-a-backend-change', 'roll-out-a-change'], 'how-to/') },
			],
		}),
	],
});
