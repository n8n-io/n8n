// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig, passthroughImageService } from 'astro/config';
import { readdirSync } from 'node:fs';
import { remarkBackendDocs } from './plugins/remark-backend-docs.mjs';

// The reading order from docs/backend/README.md. Pages missing here are appended alphabetically.
const DAY_ONE = ['index', 'patterns'];
const TIER_TWO = [
	'life-of-a-workflow-publish',
	'life-of-a-webhook-execution',
	'legacy-and-new',
	'cloud-coupling',
	'enterprise-gating',
];
// Month 1 pages, nested by topic as in the docs.n8n.io sidebar.
const SUBSYSTEM_GROUPS = [
	{ label: 'Processes and scale', slugs: ['startup-and-processes', 'scaling-and-multi-main', 'task-runners'] },
	{
		label: 'Running workflows',
		slugs: ['workflow-model', 'execution-engine', 'manual-executions', 'expressions', 'nodes-loading', 'engine-2'],
	},
	{ label: 'Triggers and realtime', slugs: ['scheduling-and-waiting', 'webhooks-push-and-concurrency', 'realtime'] },
	{ label: 'Storage and data', slugs: ['persistence', 'data-and-packages'] },
	{ label: 'Identity and access', slugs: ['authentication', 'sso-and-provisioning', 'authorization', 'credentials'] },
	{ label: 'Platform', slugs: ['lifecycle-and-governance', 'public-api', 'observability', 'ai-platform'] },
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

/** Nests the Month 1 pages by topic. A new page that no topic lists goes into "More". */
function subsystemGroups() {
	const all = pages([], 'subsystems/').map((item) => item.slug);
	const listed = new Set(SUBSYSTEM_GROUPS.flatMap((group) => group.slugs.map((slug) => `subsystems/${slug}`)));
	const groups = SUBSYSTEM_GROUPS.map((group) => ({
		label: group.label,
		collapsed: true,
		items: group.slugs.map((slug) => `subsystems/${slug}`).filter((slug) => all.includes(slug)),
	}));
	const rest = all.filter((slug) => !listed.has(slug));
	if (rest.length > 0) groups.push({ label: 'More', collapsed: true, items: rest });
	return groups.filter((group) => group.items.length > 0);
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
			favicon: '/favicon.ico',
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
				{ label: 'Month 1', items: subsystemGroups() },
				{ label: 'How-to', items: pages([], 'how-to/') },
			],
		}),
	],
});
