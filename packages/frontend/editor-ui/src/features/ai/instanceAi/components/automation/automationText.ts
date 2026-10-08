import lowerFirst from 'lodash/lowerFirst';
import type { AutomationProposalCard } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { describeSchedule } from '@/features/agents/utils/scheduleBuilder';
import {
	timezoneLabel,
	triggerLineKey,
	type AutomationPlace,
	type AutomationTriggerForm,
} from './automationProposal';

/**
 * Translated text of the automation card that more than one part of the card shows. The rules
 * stay in `automationProposal.ts`; these functions only turn their keys into text.
 */

/** "Runs at 08:00, Monday through Friday (United Kingdom Time)", or the clause without "Runs". */
export function triggerText(
	trigger: AutomationProposalCard['trigger'],
	form: AutomationTriggerForm = 'line',
): string | undefined {
	const i18n = useI18n();
	const line = triggerLineKey(trigger, form);
	if (!line) return undefined;
	if (!('cron' in line)) return i18n.baseText(line.key);
	const description = describeSchedule(line.cron);
	if (!description) return i18n.baseText(line.fallbackKey);
	const timezone = line.timezone === undefined ? '' : timezoneLabel(line.timezone, i18n.locale);
	// cronstrue starts with a capital ("At 08:00"), and the copy puts it mid-sentence.
	return i18n.baseText(line.key, {
		interpolate: { description: lowerFirst(description), timezone },
	});
}

/** "This computer", the label of a linked instance, or a name in words when it has none. */
export function placeName(place: AutomationPlace): string {
	const i18n = useI18n();
	if (!place.linked) return i18n.baseText('instanceAi.automation.place.thisComputer');
	return place.linkedLabel ?? i18n.baseText('instanceAi.automation.place.otherInstance');
}
