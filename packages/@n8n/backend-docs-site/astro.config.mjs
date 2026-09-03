// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig, passthroughImageService } from 'astro/config';
import { readdirSync } from 'node:fs';
import starlightFullViewMode from 'starlight-fullview-mode';
import { remarkBackendDocs } from './plugins/remark-backend-docs.mjs';

// The reading order from docs/backend/README.md. Pages missing here are appended alphabetically.
const DAY_ONE = ['index', 'patterns', 'inventory'];
const TIER_TWO = [
	'life-of-a-workflow-publish',
	'life-of-a-webhook-execution',
	'legacy-and-new',
	'cloud-coupling',
	'enterprise-gating',
];
const SUBSYSTEMS = [
	'startup-and-processes',
	'workflow-model',
	'execution-engine',
	'manual-executions',
	'expressions',
	'scheduling-and-waiting',
	'scaling-and-multi-main',
	'task-runners',
	'persistence',
	'webhooks-push-and-concurrency',
	'nodes-loading',
	'engine-2',
	'authentication',
	'sso-and-provisioning',
	'authorization',
	'credentials',
	'lifecycle-and-governance',
	'public-api',
	'observability',
	'data-and-packages',
	'ai-platform',
	'realtime',
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
	image: { service: passthroughImageService() },
	// Keep the text as written. Smartypants would turn quotes and dots into typographic variants.
	markdown: { smartypants: false, remarkPlugins: [remarkBackendDocs] },
	integrations: [
		starlight({
			title: 'n8n backend docs',
			description: 'Onboarding documents for the n8n backend, rendered from docs/backend.',
			customCss: ['./src/styles/custom.css'],
			// Adds a toggle that collapses the left sidebar and the table of contents.
			plugins: [starlightFullViewMode({})],
			components: {
				Head: './src/components/Head.astro',
				PageTitle: './src/components/PageTitle.astro',
			},
			sidebar: [
				{ label: 'Day 1', items: DAY_ONE.map((slug) => ({ slug })) },
				{
					label: 'Week 1',
					items: pages(TIER_TWO).filter((item) => !DAY_ONE.includes(item.slug)),
				},
				{ label: 'Month 1', items: pages(SUBSYSTEMS, 'subsystems/') },
			],
		}),
	],
});
