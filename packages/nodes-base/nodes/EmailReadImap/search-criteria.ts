/* eslint-disable @typescript-eslint/naming-convention -- keys are IMAP search keys and header names */
import type { SearchObject } from '@n8n/imap';

/** A single node-imap search criterion: a bare search key, or a search key with arguments. */
export type SearchCriteria = string | [string, ...unknown[]];

const FLAG_KEYS: Record<string, SearchObject | undefined> = {
	ALL: { all: true },
	ANSWERED: { answered: true },
	DELETED: { deleted: true },
	DRAFT: { draft: true },
	FLAGGED: { flagged: true },
	NEW: { new: true },
	OLD: { old: true },
	RECENT: { recent: true },
	SEEN: { seen: true },
	UNANSWERED: { answered: false },
	UNDELETED: { deleted: false },
	UNDRAFT: { draft: false },
	UNFLAGGED: { flagged: false },
	UNSEEN: { seen: false },
};

type ValueBuilder<T> = (value: T) => SearchObject;

const STRING_KEYS: Record<string, ValueBuilder<string> | undefined> = {
	BCC: (value) => ({ bcc: value }),
	BODY: (value) => ({ body: value }),
	CC: (value) => ({ cc: value }),
	FROM: (value) => ({ from: value }),
	SUBJECT: (value) => ({ subject: value }),
	TEXT: (value) => ({ text: value }),
	TO: (value) => ({ to: value }),
};

const DATE_KEYS: Record<string, ValueBuilder<string> | undefined> = {
	BEFORE: (value) => ({ before: value }),
	ON: (value) => ({ on: value }),
	SINCE: (value) => ({ since: value }),
	SENTBEFORE: (value) => ({ sentBefore: value }),
	SENTON: (value) => ({ sentOn: value }),
	SENTSINCE: (value) => ({ sentSince: value }),
};

const KEYWORD_KEYS: Record<string, ValueBuilder<string> | undefined> = {
	KEYWORD: (value) => ({ keyword: value }),
	UNKEYWORD: (value) => ({ unKeyword: value }),
};

const SIZE_KEYS: Record<string, ValueBuilder<number> | undefined> = {
	LARGER: (value) => ({ larger: value }),
	SMALLER: (value) => ({ smaller: value }),
};

const SEQUENCE_PART = /^(?:[1-9]\d*|\*)(?::(?:[1-9]\d*|\*))?$/;

const toText = (key: string, value: unknown): string => {
	const text = String(value);
	// imapflow's compiler either skips a falsy value - dropping the criterion and widening the
	// search - or compiles it to an empty atom, so no search key here has a use for one.
	if (text === '') {
		throw new Error(`IMAP search criterion "${key}" needs a non-empty value.`);
	}
	return text;
};

const requireArgs = (key: string, args: unknown[], count: number) => {
	if (args.length !== count) {
		throw new Error(
			`IMAP search criterion "${key}" takes ${count} argument(s), got ${args.length}.`,
		);
	}
};

const toDate = (key: string, value: unknown): string => {
	const parsed =
		value instanceof Date ? value : new Date(typeof value === 'number' ? value : String(value));
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(
			`IMAP search criterion "${key}" needs a Date or a parseable date string, got "${String(value)}".`,
		);
	}
	// Deliberately a string: given a Date, imapflow rewrites SINCE/BEFORE into a
	// `now`-relative YOUNGER/OLDER on servers advertising WITHIN, which is time- rather
	// than date-precise and underflows to `YOUNGER 0` when the host is east of UTC.
	// The components are local, as node-imap's were.
	const month = String(parsed.getMonth() + 1).padStart(2, '0');
	const day = String(parsed.getDate()).padStart(2, '0');
	return `${parsed.getFullYear()}-${month}-${day}`;
};

const toModseq = (key: string, value: unknown): bigint => {
	let modseq: bigint;
	try {
		modseq = BigInt(String(value));
	} catch {
		throw new Error(`IMAP search criterion "${key}" needs a whole number, got "${String(value)}".`);
	}
	// imapflow's compiler skips a zero value, which would drop the criterion.
	if (modseq < 1n) {
		throw new Error(`IMAP search criterion "${key}" needs a positive value, got "${modseq}".`);
	}
	return modseq;
};

const toSequenceSet = (values: unknown[]): string | undefined => {
	const parts = values.flatMap((value) => String(value).split(','));
	if (parts.length === 0 || !parts.every((part) => SEQUENCE_PART.test(part))) return undefined;
	return parts.join(',');
};

const isCriteria = (value: unknown): value is SearchCriteria =>
	typeof value === 'string' || (Array.isArray(value) && typeof value[0] === 'string');

const toObject = (key: string, args: unknown[]): SearchObject => {
	const upper = key.toUpperCase();

	const flag = FLAG_KEYS[upper];
	// copied because `mergeInto` mutates its target
	if (flag) return { ...flag };

	const buildString = STRING_KEYS[upper];
	if (buildString) {
		requireArgs(key, args, 1);
		return buildString(toText(key, args[0]));
	}

	const buildDate = DATE_KEYS[upper];
	if (buildDate) {
		requireArgs(key, args, 1);
		return buildDate(toDate(key, args[0]));
	}

	// imapflow drops KEYWORD and UNKEYWORD without a word unless the mailbox reports the flag in
	// PERMANENTFLAGS (or advertises `\*`), which widens the search — nothing here can detect that.
	const buildKeyword = KEYWORD_KEYS[upper];
	if (buildKeyword) {
		requireArgs(key, args, 1);
		const keyword = toText(key, args[0]);
		// imapflow's formatFlag turns \Recent into `false`, which its compiler then renders as
		// `NOT KEYWORD false` — the inverse of what was asked for.
		if (keyword.toLowerCase() === '\\recent') {
			throw new Error(`IMAP search criterion "${key}" cannot be used with the \\Recent flag.`);
		}
		return buildKeyword(keyword);
	}

	const buildSize = SIZE_KEYS[upper];
	if (buildSize) {
		requireArgs(key, args, 1);
		const size = Number(String(args[0]));
		if (!Number.isSafeInteger(size)) {
			throw new Error(
				`IMAP search criterion "${key}" needs a whole number, got "${String(args[0])}".`,
			);
		}
		// imapflow's compiler skips a zero value, and a dropped SMALLER matches every message.
		if (size < 1) {
			throw new Error(
				`IMAP search criterion "${key}" needs a positive number of bytes, got "${size}".`,
			);
		}
		return buildSize(size);
	}

	switch (upper) {
		case 'HEADER': {
			requireArgs(key, args, 2);
			// An empty value is the "header is present" form, so only the field name is required.
			return { header: { [toText(key, args[0])]: String(args[1]) } };
		}

		case 'UID': {
			const uid = toSequenceSet(args);
			if (!uid) {
				throw new Error(
					`IMAP search criterion "${key}" needs a sequence set such as "42:*", got "${args.map(String).join(',')}".`,
				);
			}
			return { uid };
		}

		case 'OR': {
			requireArgs(key, args, 2);
			if (!isCriteria(args[0]) || !isCriteria(args[1])) {
				throw new Error(`IMAP search criterion "${key}" takes two search criteria as arguments.`);
			}
			return { or: [criterionToObject(args[0]), criterionToObject(args[1])] };
		}

		case 'X-GM-RAW': {
			requireArgs(key, args, 1);
			return { gmraw: toText(key, args[0]) };
		}

		// imapflow drops emailId and threadId without a word when the server advertises neither
		// OBJECTID nor X-GM-EXT-1, which widens the search — nothing here can detect that.
		case 'X-GM-MSGID': {
			requireArgs(key, args, 1);
			return { emailId: toText(key, args[0]) };
		}

		case 'X-GM-THRID': {
			requireArgs(key, args, 1);
			return { threadId: toText(key, args[0]) };
		}

		case 'X-GM-LABELS': {
			requireArgs(key, args, 1);
			return { labels: { has: [toText(key, args[0])] } };
		}

		case 'MODSEQ': {
			requireArgs(key, args, 1);
			return { modseq: toModseq(key, args[0]) };
		}
	}

	// node-imap's last resort: a criterion that matches no known search key may still be a sequence set.
	const seq = toSequenceSet([key, ...args]);
	if (seq) return { seq };

	throw new Error(
		`Unknown IMAP search criterion "${key}". Expected a standard IMAP search key such as "UNSEEN", ["SINCE", "19-Aug-2026"] or ["UID", "42:*"].`,
	);
};

const parseCriterion = (criterion: SearchCriteria) => {
	if (!isCriteria(criterion)) {
		throw new Error(
			`Unexpected IMAP search criterion, expected a string or an array: ${JSON.stringify(criterion)}`,
		);
	}
	const key = typeof criterion === 'string' ? criterion : criterion[0];
	const args: unknown[] = typeof criterion === 'string' ? [] : criterion.slice(1);

	return key.startsWith('!')
		? { key: key.slice(1), args, negated: true }
		: { key, args, negated: false };
};

const criterionToObject = (criterion: SearchCriteria): SearchObject => {
	const { key, args, negated } = parseCriterion(criterion);
	const object = toObject(key, args);
	return negated ? { not: object } : object;
};

const headersOverlap = (a: SearchObject, b: SearchObject) =>
	Object.keys(a.header ?? {}).some((name) => name in (b.header ?? {}));

const canMerge = (target: SearchObject, part: SearchObject) => {
	const shared = Object.keys(target).filter((key) => key in part);
	if (shared.length === 0) return true;
	return shared.length === 1 && shared[0] === 'header' && !headersOverlap(target, part);
};

const mergeInto = (target: SearchObject, part: SearchObject) => {
	const header = { ...target.header, ...part.header };
	Object.assign(target, part);
	if (Object.keys(header).length > 0) target.header = header;
};

/**
 * A SearchObject has no AND key: every criterion is a distinct property, so two criteria using
 * the same key cannot both survive a plain merge. Such criteria are kept in separate groups and
 * recombined with De Morgan, since dropping one would widen the search instead of narrowing it.
 */
const andMerge = (parts: SearchObject[]): SearchObject => {
	const groups: SearchObject[] = [];
	for (const part of parts) {
		const target = groups.find((group) => canMerge(group, part));
		if (target) mergeInto(target, part);
		else groups.push({ ...part });
	}

	if (groups.length <= 1) return groups[0] ?? {};
	return { not: { or: groups.map((group) => ({ not: group })) } };
};

/**
 * Translates node-imap style search criteria — still the documented format of the IMAP trigger's
 * custom email config — into the SearchObject imapflow expects.
 */
export function toSearchObject(criteria: SearchCriteria[]): SearchObject {
	// imapflow compiles an empty object to `SEARCH ALL`, silently widening the query.
	if (criteria.length === 0) {
		throw new Error('IMAP search needs at least one criterion.');
	}

	const positive: SearchObject[] = [];
	const negated: SearchObject[] = [];

	for (const criterion of criteria) {
		const parsed = parseCriterion(criterion);
		const object = toObject(parsed.key, parsed.args);
		(parsed.negated ? negated : positive).push(object);
	}

	if (negated.length === 1) positive.push({ not: negated[0] });
	// NOT a AND NOT b is NOT (a OR b); a single not key cannot hold both.
	else if (negated.length > 1) positive.push({ not: { or: negated } });

	return andMerge(positive);
}
