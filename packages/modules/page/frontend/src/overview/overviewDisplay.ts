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

const PROJECT_ICON: IconName = 'layers';
const CONNECTION_ICON: IconName = 'key-round';
const NO_CONNECTION_ICON: IconName = 'unplug';

/** How the header of a section shows. `accent` names a class of the accent styles. */
export type SectionDisplay = { icon: IconName; label: string; accent: string };

/**
 * Gives the icon, the label and the accent of a section.
 * A project section shows the name of its project. A connection section shows the name of its credential type.
 */
export function toSectionDisplay(
	section: OverviewSection,
	translate: (key: BaseTextKey) => string,
): SectionDisplay {
	switch (section.kind) {
		case 'project':
			return { icon: PROJECT_ICON, label: section.projectName, accent: section.kind };
		case 'category':
			return {
				icon: CATEGORY_ICONS[section.category],
				label: translate(CATEGORY_LABELS[section.category]),
				accent: section.category,
			};
		case 'connection':
			return { icon: CONNECTION_ICON, label: section.credentialType, accent: section.kind };
		case 'noConnection':
			return {
				icon: NO_CONNECTION_ICON,
				label: translate('page.overview.section.noConnection'),
				accent: section.kind,
			};
	}
}
