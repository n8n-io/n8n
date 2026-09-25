import { resultCardSchema, type ResultCard, type ResultCardArchetype } from '@n8n/api-types';

import { isPlainObject, truncate } from './format';
import {
	buildGenericCard,
	candidateColumns,
	objectItems,
	recordItems,
	tableFromRows,
	type GenericSlots,
} from './generic';
import {
	INCLUDE_THRESHOLD,
	MAX_RECORD_COLUMNS,
	MIN_ARCHETYPE_CONFIDENCE,
	titleOptions,
} from './questions';
import type { JevAnswers, JevQuestions, NodeRunFacts } from './types';

/*
 * Jev never writes content. Every answer is validated against the question the mapper itself
 * asked for this candidate: the key must have been asked, the answer type must match the
 * question type, and a `choice` must be one of the offered `criteria` keys. Anything else —
 * unknown keys, wrong types, primitives, `null`, free text — is ignored, never thrown on.
 */

/** Validated `choice` answer for `key`, or `undefined` when it was not asked / not offered. */
function choiceAnswer(
	answers: JevAnswers,
	key: string,
	questions: JevQuestions,
): { value: string; confidence: number } | undefined {
	const question = questions[key];
	const answer: unknown = answers[key];
	if (question?.type !== 'choice' || !isPlainObject(answer)) return undefined;
	const value = answer.choice;
	if (typeof value !== 'string' || !Object.keys(question.criteria).includes(value))
		return undefined;
	const confidence = typeof answer.confidence === 'number' ? answer.confidence : 1;
	return { value, confidence };
}

function pick(answers: JevAnswers, key: string, questions: JevQuestions): string | undefined {
	return choiceAnswer(answers, key, questions)?.value;
}

function numberAnswer(
	answers: JevAnswers,
	key: string,
	questions: JevQuestions,
	type: 'noul' | 'score',
): number | undefined {
	const question = questions[key];
	const answer: unknown = answers[key];
	if (question?.type !== type || !isPlainObject(answer)) return undefined;
	const value = answer[type];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function noul(answers: JevAnswers, key: string, questions: JevQuestions): number | undefined {
	return numberAnswer(answers, key, questions, 'noul');
}

function score(answers: JevAnswers, key: string, questions: JevQuestions): number | undefined {
	return numberAnswer(answers, key, questions, 'score');
}

export function applyAnswers(
	facts: NodeRunFacts,
	defaultCard: ResultCard,
	archetypes: ResultCardArchetype[],
	isRegistryCard: boolean,
	questions: JevQuestions,
	answers?: JevAnswers,
): ResultCard | null {
	if (!isPlainObject(answers) || Object.keys(answers).length === 0) return defaultCard;
	let used = false;

	const include = noul(answers, 'include', questions);
	if (include !== undefined && include < INCLUDE_THRESHOLD) return null;

	let archetype: ResultCardArchetype = defaultCard.type;
	const chosenArchetype = choiceAnswer(answers, 'archetype', questions);
	if (
		chosenArchetype &&
		archetypes.includes(chosenArchetype.value as ResultCardArchetype) &&
		chosenArchetype.confidence >= MIN_ARCHETYPE_CONFIDENCE
	) {
		archetype = chosenArchetype.value as ResultCardArchetype;
		used = used || archetype !== defaultCard.type;
	}

	const slots: GenericSlots = {};

	const valuePath = pick(answers, 'metric_value', questions);
	if (valuePath) {
		slots.valuePath = valuePath;
		used = true;
	}
	// `metric_label` offers `field:<path>` options plus `name` (= keep the default label).
	const label = pick(answers, 'metric_label', questions);
	if (label?.startsWith('field:')) {
		slots.labelPath = label;
		used = true;
	}
	const breakdownPath = pick(answers, 'metric_breakdown', questions);
	if (breakdownPath) {
		slots.breakdownPath = breakdownPath;
		used = true;
	}
	const trendPath = pick(answers, 'metric_trend', questions);
	if (trendPath) {
		slots.trendPath = trendPath;
		used = true;
	}
	const listTitle = pick(answers, 'list_title', questions);
	if (listTitle) {
		slots.listTitlePath = listTitle;
		used = true;
	}
	const listSubtitle = pick(answers, 'list_subtitle', questions);
	if (listSubtitle) {
		slots.listSubtitlePath = listSubtitle;
		used = true;
	}
	const listMeta = pick(answers, 'list_meta', questions);
	if (listMeta) {
		slots.listMetaPath = listMeta;
		used = true;
	}

	// Column scores: only the `col_<i>` questions that were actually asked are honoured.
	const columns = candidateColumns(recordItems(facts).rows);
	if (columns.length > MAX_RECORD_COLUMNS) {
		const scored = columns.map((column, index) => ({
			column,
			index,
			score: score(answers, `col_${index}`, questions),
		}));
		if (scored.some((entry) => entry.score !== undefined)) {
			slots.columns = scored
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.index - b.index)
				.slice(0, MAX_RECORD_COLUMNS)
				.sort((a, b) => a.index - b.index)
				.map((entry) => entry.column);
			used = true;
		}
	}

	let card: ResultCard | null;
	if (isRegistryCard) {
		card = { ...defaultCard };
		if (card.type === 'records' && slots.columns) {
			card = { ...card, ...tableFromRows(objectItems(facts), facts.itemCount, slots.columns) };
		}
	} else {
		card =
			archetype === defaultCard.type && Object.keys(slots).length === 0
				? { ...defaultCard }
				: buildGenericCard(facts, archetype, slots);
		if (!card) return defaultCard;
		const title = pick(answers, 'title', questions);
		const titleText = title === undefined ? undefined : titleOptions(facts)[title];
		if (titleText) {
			card.title = truncate(titleText, 80);
			used = true;
		}
	}

	if (card.type === 'email') {
		const showPreview = noul(answers, 'email_show_preview', questions);
		if (showPreview !== undefined) {
			card = { ...card, preview: showPreview >= INCLUDE_THRESHOLD ? card.preview : undefined };
			used = true;
		}
		const showAttachments = noul(answers, 'email_show_attachments', questions);
		if (showAttachments !== undefined) {
			card = {
				...card,
				attachments: showAttachments >= INCLUDE_THRESHOLD ? card.attachments : undefined,
			};
			used = true;
		}
	}

	if (card.type === 'message') {
		const emphasis = pick(answers, 'message_emphasis', questions);
		if (emphasis === 'text') {
			card = { ...card, title: truncate(card.text, 80) };
			used = true;
		} else if (emphasis === 'destination') {
			used = true;
		}
	}

	const parsed = resultCardSchema.safeParse({ ...card, source: used ? 'jev' : card.source });
	return parsed.success ? parsed.data : defaultCard;
}
