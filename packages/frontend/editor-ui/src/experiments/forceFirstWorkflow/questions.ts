import type { BaseTextKey } from '@n8n/i18n';

import type { DigestFormat, DigestProvider } from './workflows/dailyInboxDigest';

export const QUESTION_IDS = ['format', 'schedule', 'provider'] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export type QuestionAnswer =
	| { id: 'format'; value: DigestFormat }
	| { id: 'schedule'; hour: number; minute: number; weekdaysOnly: boolean }
	| { id: 'provider'; value: DigestProvider };

export interface ChoiceOption<TValue extends string> {
	value: TValue;
	labelKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	badge?: 'popular';
	/** Node whose icon stands for the option. */
	nodeTypeName?: string;
}

export const FORMAT_OPTIONS: Array<ChoiceOption<DigestFormat>> = [
	{
		value: 'priority',
		labelKey: 'experiments.forceFirstWorkflow.format.priority',
		descriptionKey: 'experiments.forceFirstWorkflow.format.priority.description',
		badge: 'popular',
	},
	{
		value: 'bullets',
		labelKey: 'experiments.forceFirstWorkflow.format.bullets',
		descriptionKey: 'experiments.forceFirstWorkflow.format.bullets.description',
	},
	{
		value: 'briefing',
		labelKey: 'experiments.forceFirstWorkflow.format.briefing',
		descriptionKey: 'experiments.forceFirstWorkflow.format.briefing.description',
	},
	{
		value: 'decide',
		labelKey: 'experiments.forceFirstWorkflow.format.decide',
		descriptionKey: 'experiments.forceFirstWorkflow.format.decide.description',
	},
];

// IMAP-only providers are left out. A scheduled digest needs a node that reads the inbox on
// demand, and the IMAP node only triggers on new mail.
export const PROVIDER_OPTIONS: Array<ChoiceOption<DigestProvider>> = [
	{
		value: 'gmail',
		nodeTypeName: 'n8n-nodes-base.gmail',
		labelKey: 'experiments.forceFirstWorkflow.provider.gmail',
		descriptionKey: 'experiments.forceFirstWorkflow.provider.gmail.description',
	},
	{
		value: 'outlook',
		nodeTypeName: 'n8n-nodes-base.microsoftOutlook',
		labelKey: 'experiments.forceFirstWorkflow.provider.outlook',
		descriptionKey: 'experiments.forceFirstWorkflow.provider.outlook.description',
	},
];

export const SCHEDULE_TIMES: Array<{ hour: number; minute: number }> = [
	{ hour: 6, minute: 0 },
	{ hour: 8, minute: 0 },
	{ hour: 10, minute: 0 },
	{ hour: 12, minute: 0 },
	{ hour: 18, minute: 0 },
];

export const DEFAULT_SCHEDULE_TIME = SCHEDULE_TIMES[1];

/** "8:00 AM" in the user's locale. */
export function formatTime(hour: number, minute: number): string {
	return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit',
	});
}

/** Reads the value of a time input, "HH:MM". */
export function parseTimeInput(value: string): { hour: number; minute: number } | undefined {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value);
	if (!match) return undefined;

	const hour = Number(match[1]);
	const minute = Number(match[2]);
	return hour <= 23 && minute <= 59 ? { hour, minute } : undefined;
}
