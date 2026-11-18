import type { WorkflowTriggerCategory } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

import type { OverviewSection } from './pageOverviewSections';

export const CATEGORY_ICONS: Record<WorkflowTriggerCategory, IconName> = {
	schedule: 'clock',
	webhook: 'webhook',
	form: 'form',
	chat: 'message-circle',
	appEvent: 'zap',
	subWorkflow: 'workflow',
	manual: 'mouse-pointer',
};

export const CATEGORY_LABELS: Record<WorkflowTriggerCategory, BaseTextKey> = {
	schedule: 'page.overview.category.schedule',
	webhook: 'page.overview.category.webhook',
	form: 'page.overview.category.form',
	chat: 'page.overview.category.chat',
	appEvent: 'page.overview.category.appEvent',
	subWorkflow: 'page.overview.category.subWorkflow',
	manual: 'page.overview.category.manual',
};

/** The short name of a category, for the chip of a card. */
export const TRIGGER_LABELS: Record<WorkflowTriggerCategory, BaseTextKey> = {
	schedule: 'page.overview.trigger.schedule',
	webhook: 'page.overview.trigger.webhook',
	form: 'page.overview.trigger.form',
	chat: 'page.overview.trigger.chat',
	appEvent: 'page.overview.trigger.appEvent',
	subWorkflow: 'page.overview.trigger.subWorkflow',
	manual: 'page.overview.trigger.manual',
};

/** Gives the label of a section: the name of its project, or the name of its category. */
export function toSectionLabel(
	section: OverviewSection,
	translate: (key: BaseTextKey) => string,
): string {
	return section.kind === 'project'
		? section.projectName
		: translate(CATEGORY_LABELS[section.category]);
}
