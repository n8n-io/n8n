import type { SkillCatalogCategory } from '@n8n/api-types';
import type { useI18n } from '@n8n/i18n';

const keys = {
	development: 'settings.context.skills.catalog.category.development',
	design: 'settings.context.skills.catalog.category.design',
	documents: 'settings.context.skills.catalog.category.documents',
	data: 'settings.context.skills.catalog.category.data',
	marketing: 'settings.context.skills.catalog.category.marketing',
	research: 'settings.context.skills.catalog.category.research',
	operations: 'settings.context.skills.catalog.category.operations',
	other: 'settings.context.skills.catalog.category.other',
} as const;

export function categoryLabel(category: SkillCatalogCategory, i18n: ReturnType<typeof useI18n>) {
	return i18n.baseText(keys[category]);
}
