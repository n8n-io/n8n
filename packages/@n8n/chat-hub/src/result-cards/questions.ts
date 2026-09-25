import type { ResultCard, ResultCardArchetype } from '@n8n/api-types';

import { str, truncate } from './format';
import {
	candidateColumns,
	fieldsOfType,
	numericFields,
	objectItems,
	recordItems,
	stringFields,
} from './generic';
import { NO_TEXT_PLACEHOLDER } from './registry';
import type { JevQuestions, NodeRunFacts } from './types';

export const ARCHETYPE_DESCRIPTIONS: Record<ResultCardArchetype, string> = {
	email: 'an email that was sent or received',
	message: 'a chat message posted to a channel or person',
	records: 'a table of records — several rows sharing the same columns',
	metric: 'one headline number, optionally with a breakdown or trend',
	list: 'a short list of things, each with a title',
	keyValue: 'a handful of labelled values about one thing',
};

export const MIN_ARCHETYPE_CONFIDENCE = 0.35;
export const INCLUDE_THRESHOLD = 0.5;
export const MAX_RECORD_COLUMNS = 4;
export const PREVIEW_QUESTION_MIN_LENGTH = 120;

function describeField(field: { type: string; sample: string }): string {
	return field.sample ? `${field.type} · e.g. ${field.sample}` : field.type;
}

/** Title candidates for generic cards: `node`, `workflow`, `field:<path>` for short string values. */
export function titleOptions(facts: NodeRunFacts): Record<string, string> {
	const options: Record<string, string> = { node: facts.nodeName, workflow: facts.workflow.name };
	const first = objectItems(facts)[0] ?? {};
	for (const field of stringFields(facts)) {
		const value = first[field.path];
		if (typeof value === 'string' && value.trim().length > 0 && value.length <= 60) {
			options[`field:${field.path}`] = value.trim();
		}
	}
	return options;
}

export function buildQuestions(
	facts: NodeRunFacts,
	archetypes: ResultCardArchetype[],
	isRegistryCard: boolean,
	defaultCard: ResultCard,
): JevQuestions {
	const questions: JevQuestions = {};
	const first = objectItems(facts)[0] ?? {};

	if (!isRegistryCard) {
		questions.include = {
			type: 'noul',
			instructions:
				'Would a non-technical reader want this output shown as a card — an outcome or a number worth glancing at — rather than as plain text? Say no for technical pass-through data.',
		};
		if (archetypes.length > 1) {
			questions.archetype = {
				type: 'choice',
				instructions:
					'Which card layout best represents this output for a reader who wants the gist?',
				criteria: Object.fromEntries(
					archetypes.map((archetype) => [archetype, ARCHETYPE_DESCRIPTIONS[archetype]]),
				),
			};
		}
		const titles = titleOptions(facts);
		if (Object.keys(titles).length > 1) {
			questions.title = {
				type: 'choice',
				instructions: 'Which is the best one-line title for this card?',
				criteria: titles,
			};
		}
	}

	if (archetypes.includes('metric')) {
		const numeric = numericFields(facts);
		if (numeric.length > 1) {
			questions.metric_value = {
				type: 'choice',
				instructions: 'Which number is the headline value a reader cares about most?',
				criteria: Object.fromEntries(numeric.map((field) => [field.path, describeField(field)])),
			};
		}
		const labels = stringFields(facts).filter(
			(field) =>
				typeof first[field.path] === 'string' && (first[field.path] as string).length <= 60,
		);
		if (labels.length > 0) {
			questions.metric_label = {
				type: 'choice',
				instructions: 'What should the short label under the headline number say?',
				criteria: {
					...Object.fromEntries(
						labels.map((field) => [`field:${field.path}`, `use this value: ${field.sample}`]),
					),
					name: 'use the name of the value field',
				},
			};
		}
		const breakdowns = fieldsOfType(facts, 'object<number>');
		if (breakdowns.length > 1) {
			questions.metric_breakdown = {
				type: 'choice',
				instructions: 'Which grouping should be shown as a bar breakdown under the number?',
				criteria: {
					...Object.fromEntries(breakdowns.map((field) => [field.path, describeField(field)])),
					none: 'no breakdown',
				},
			};
		}
		const trends = fieldsOfType(facts, 'array<number>');
		if (trends.length > 1) {
			questions.metric_trend = {
				type: 'choice',
				instructions: 'Which series should be drawn as a small trend line?',
				criteria: {
					...Object.fromEntries(trends.map((field) => [field.path, describeField(field)])),
					none: 'no trend line',
				},
			};
		}
	}

	if (archetypes.includes('list')) {
		const { rows } = recordItems(facts);
		const columns = candidateColumns(rows);
		const textColumns = columns.filter((column) => typeof rows[0]?.[column] === 'string');
		if (textColumns.length > 1) {
			const criteria = Object.fromEntries(
				textColumns.map((column) => [column, `e.g. ${truncate(String(rows[0][column]), 40)}`]),
			);
			questions.list_title = {
				type: 'choice',
				instructions: 'Which field is the title of each list item?',
				criteria,
			};
			questions.list_subtitle = {
				type: 'choice',
				instructions: 'Which field is a good one-line subtitle?',
				criteria: { ...criteria, none: 'no subtitle' },
			};
		}
		const metaColumns = columns.filter((column) =>
			['number', 'string'].includes(typeof rows[0]?.[column]),
		);
		if (metaColumns.length > 1) {
			questions.list_meta = {
				type: 'choice',
				instructions:
					'Which short value belongs at the right edge of each item (a rank, a date, a count)?',
				criteria: {
					...Object.fromEntries(
						metaColumns.map((column) => [column, `e.g. ${truncate(String(rows[0][column]), 40)}`]),
					),
					none: 'nothing',
				},
			};
		}
	}

	if (archetypes.includes('records')) {
		const { rows } = recordItems(facts);
		const columns = candidateColumns(rows);
		if (columns.length > MAX_RECORD_COLUMNS) {
			columns.forEach((column, index) => {
				questions[`col_${index}`] = {
					type: 'score',
					instructions: `How important is the column "${column}" (e.g. ${truncate(str(rows[0]?.[column]), 40)}) for a reader who wants the gist of these records? 0 = noise, 1 = essential.`,
				};
			});
		}
	}

	if (defaultCard.type === 'email') {
		if ((defaultCard.preview?.length ?? 0) >= PREVIEW_QUESTION_MIN_LENGTH) {
			questions.email_show_preview = {
				type: 'noul',
				instructions:
					'Is the body preview worth showing under the subject, or is the subject enough?',
			};
		}
		if (defaultCard.attachments?.length) {
			questions.email_show_attachments = {
				type: 'noul',
				instructions: 'Are the attachment names worth showing on the card?',
			};
		}
	}

	// Leading with the text only makes sense when there is real text to lead with.
	if (defaultCard.type === 'message' && defaultCard.text !== NO_TEXT_PLACEHOLDER) {
		questions.message_emphasis = {
			type: 'choice',
			instructions: 'What should the card title lead with?',
			criteria: {
				destination: 'where the message was posted',
				text: 'the message text itself',
			},
		};
	}

	return questions;
}
