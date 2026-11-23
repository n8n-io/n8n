import type { BaseTextKey } from '@n8n/i18n';

export const CATALOG_REVIEWED_AT = '2026-11-17';
export const CATALOG_CATEGORIES = [
	'build',
	'improve',
	'agents',
	'data',
	'writing',
	'design',
] as const;
export type SkillCatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export type SkillCatalogInstallation = { id: string; label: string };

export interface SkillCatalogEntry {
	location: string;
	id: string;
	category: SkillCatalogCategory;
	publisher: string;
	url: string;
	nameKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	requirementsKey: BaseTextKey;
	license: string;
	reviewedRevision?: string;
	installs?: number;
	rank?: number;
}

const N8N_SKILL_DEFAULTS = {
	publisher: 'n8n',
	requirementsKey: 'settings.context.skills.catalog.requirements.n8n',
	license: 'Apache-2.0',
	reviewedRevision: '626f50fdf2934116eea2c5469339e03d2d524e83',
} satisfies Partial<SkillCatalogEntry>;

const MARKETING_SKILL_DEFAULTS = {
	publisher: 'coreyhaines31',
	category: 'writing',
	requirementsKey: 'settings.context.skills.catalog.requirements.text',
	license: 'MIT',
	reviewedRevision: '1f837447b20bb6f0e72d87b80ece1c221c362c7d',
} satisfies Partial<SkillCatalogEntry>;

/** A reviewed selection. Browsing this list makes no network requests. */
export const SKILL_CATALOG: readonly SkillCatalogEntry[] = [
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-workflow-lifecycle-official',
		category: 'build',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-workflow-lifecycle-official',
		location: 'skills/n8n-workflow-lifecycle-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-workflow-lifecycle-official.name',
		descriptionKey:
			'settings.context.skills.catalog.entries.n8n-workflow-lifecycle-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-subworkflows-official',
		category: 'build',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-subworkflows-official',
		location: 'skills/n8n-subworkflows-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-subworkflows-official.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-subworkflows-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-expressions-official',
		category: 'build',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-expressions-official',
		location: 'skills/n8n-expressions-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-expressions-official.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-expressions-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-node-configuration-official',
		category: 'build',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-node-configuration-official',
		location: 'skills/n8n-node-configuration-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-node-configuration-official.name',
		descriptionKey:
			'settings.context.skills.catalog.entries.n8n-node-configuration-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-code-nodes-official',
		category: 'build',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-code-nodes-official',
		location: 'skills/n8n-code-nodes-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-code-nodes-official.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-code-nodes-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-loops-official',
		category: 'build',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-loops-official',
		location: 'skills/n8n-loops-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-loops-official.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-loops-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-agents-official',
		category: 'agents',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-agents-official',
		location: 'skills/n8n-agents-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-agents-official.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-agents-official.description',
	},

	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-debugging-official',
		category: 'improve',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-debugging-official',
		location: 'skills/n8n-debugging-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-debugging-official.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-debugging-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-credentials-and-security-official',
		category: 'build',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-credentials-and-security-official',
		location: 'skills/n8n-credentials-and-security-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-credentials-and-security-official.name',
		descriptionKey:
			'settings.context.skills.catalog.entries.n8n-credentials-and-security-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-binary-and-data-official',
		category: 'data',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-binary-and-data-official',
		location: 'skills/n8n-binary-and-data-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-binary-and-data-official.name',
		descriptionKey:
			'settings.context.skills.catalog.entries.n8n-binary-and-data-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-data-tables-official',
		category: 'data',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-data-tables-official',
		location: 'skills/n8n-data-tables-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-data-tables-official.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-data-tables-official.description',
	},
	{
		...N8N_SKILL_DEFAULTS,
		id: 'n8n-extending-mcp-official',
		category: 'agents',
		url: 'https://github.com/n8n-io/skills/tree/main/skills/n8n-extending-mcp-official',
		location: 'skills/n8n-extending-mcp-official',
		nameKey: 'settings.context.skills.catalog.entries.n8n-extending-mcp-official.name',
		descriptionKey:
			'settings.context.skills.catalog.entries.n8n-extending-mcp-official.description',
	},
	{
		id: 'anthropics/skills/frontend-design',
		category: 'design',
		publisher: 'anthropics',
		url: 'https://github.com/anthropics/skills/tree/main/skills/frontend-design',
		location: 'skills/frontend-design',
		nameKey: 'settings.context.skills.catalog.entries.frontend-design.name',
		descriptionKey: 'settings.context.skills.catalog.entries.frontend-design.description',
		requirementsKey: 'settings.context.skills.catalog.requirements.design',
		license: 'Apache-2.0',
		installs: 1130034,
		rank: 15,
		reviewedRevision: 'e4bb5d960d87126ff3b3a8af1a104b7db67560ba',
	},
	{
		id: 'juliusbrussee/caveman/caveman',
		category: 'writing',
		publisher: 'juliusbrussee',
		url: 'https://github.com/juliusbrussee/caveman/tree/main/skills/caveman',
		location: 'skills/caveman',
		nameKey: 'settings.context.skills.catalog.entries.caveman.name',
		descriptionKey: 'settings.context.skills.catalog.entries.caveman.description',
		requirementsKey: 'settings.context.skills.catalog.requirements.text',
		license: 'Apache-2.0',
		installs: 631596,
		rank: 102,
		reviewedRevision: '9b243662ff98d392bc0a95b865a554583d71be75',
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/copywriting',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/copywriting',
		location: 'skills/copywriting',
		nameKey: 'settings.context.skills.catalog.entries.copywriting.name',
		descriptionKey: 'settings.context.skills.catalog.entries.copywriting.description',
		installs: 258118,
		rank: 302,
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/seo-audit',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/seo-audit',
		location: 'skills/seo-audit',
		nameKey: 'settings.context.skills.catalog.entries.seo-audit.name',
		descriptionKey: 'settings.context.skills.catalog.entries.seo-audit.description',
		requirementsKey: 'settings.context.skills.catalog.requirements.web',
		installs: 257461,
		rank: 304,
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/marketing-psychology',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/marketing-psychology',
		location: 'skills/marketing-psychology',
		nameKey: 'settings.context.skills.catalog.entries.marketing-psychology.name',
		descriptionKey: 'settings.context.skills.catalog.entries.marketing-psychology.description',
		installs: 179908,
		rank: 347,
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/content-strategy',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/content-strategy',
		location: 'skills/content-strategy',
		nameKey: 'settings.context.skills.catalog.entries.content-strategy.name',
		descriptionKey: 'settings.context.skills.catalog.entries.content-strategy.description',
		installs: 179830,
		rank: 348,
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/ai-seo',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/ai-seo',
		location: 'skills/ai-seo',
		nameKey: 'settings.context.skills.catalog.entries.ai-seo.name',
		descriptionKey: 'settings.context.skills.catalog.entries.ai-seo.description',
		requirementsKey: 'settings.context.skills.catalog.requirements.web',
		installs: 167146,
		rank: 353,
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/copy-editing',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/copy-editing',
		location: 'skills/copy-editing',
		nameKey: 'settings.context.skills.catalog.entries.copy-editing.name',
		descriptionKey: 'settings.context.skills.catalog.entries.copy-editing.description',
		installs: 164102,
		rank: 354,
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/programmatic-seo',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/programmatic-seo',
		location: 'skills/programmatic-seo',
		nameKey: 'settings.context.skills.catalog.entries.programmatic-seo.name',
		descriptionKey: 'settings.context.skills.catalog.entries.programmatic-seo.description',
		installs: 163422,
		rank: 355,
	},
	{
		...MARKETING_SKILL_DEFAULTS,
		id: 'coreyhaines31/marketingskills/marketing-ideas',
		url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/marketing-ideas',
		location: 'skills/marketing-ideas',
		nameKey: 'settings.context.skills.catalog.entries.marketing-ideas.name',
		descriptionKey: 'settings.context.skills.catalog.entries.marketing-ideas.description',
		installs: 159635,
		rank: 359,
	},
	{
		id: 'n8n-memory-optimization',
		category: 'improve',
		publisher: 'n8n',
		url: 'https://github.com/n8n-io/n8n/tree/master/packages/frontend/editor-ui/src/features/settings/context/catalog/content/n8n-memory-optimization',
		location:
			'packages/frontend/editor-ui/src/features/settings/context/catalog/content/n8n-memory-optimization',
		nameKey: 'settings.context.skills.catalog.entries.n8n-memory-optimization.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-memory-optimization.description',
		requirementsKey: 'settings.context.skills.catalog.requirements.n8n',
		license: 'Sustainable Use License',
	},
	{
		id: 'n8n-workflow-tidy-up',
		category: 'improve',
		publisher: 'n8n',
		url: 'https://github.com/n8n-io/n8n/tree/master/packages/frontend/editor-ui/src/features/settings/context/catalog/content/n8n-workflow-tidy-up',
		location:
			'packages/frontend/editor-ui/src/features/settings/context/catalog/content/n8n-workflow-tidy-up',
		nameKey: 'settings.context.skills.catalog.entries.n8n-workflow-tidy-up.name',
		descriptionKey: 'settings.context.skills.catalog.entries.n8n-workflow-tidy-up.description',
		requirementsKey: 'settings.context.skills.catalog.requirements.n8n',
		license: 'MIT',
	},
];
