#!/usr/bin/env node
// Classifies corpus cases into equivalence classes by structural pattern shape
// (metacharacters/quantifiers/groups/classes preserved, literal runs collapsed),
// plus flags, subject-shape (ascii/bmp/astral/lone-surrogate), and outcome shape
// (no-match/zero-length/match, unset-group presence, esAgree). Keeps up to
// KEEP_PER_CLASS representatives per class, conservatively -- under-merge over
// over-merge, since this is a security-relevant engine's own coverage data.
//
// Usage: node scripts/corpus/find-near-duplicates.mjs [--write]
// Without --write: report-only (prints before/after counts, no file changes).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../../test/fixtures/corpus');
const KEEP_PER_CLASS = 1;
const WRITE = process.argv.includes('--write');
const targetsArg = process.argv.find((a) => a.startsWith('--targets='));
const ONLY_FILES = targetsArg ? new Set(targetsArg.slice('--targets='.length).split(',')) : null;

// -- pattern structural normalization -----------------------------------

function normalizePattern(pattern) {
	let out = '';
	let i = 0;
	const n = pattern.length;
	let literalRun = false;

	function flushLiteral() {
		if (literalRun) {
			out += '•'; // one placeholder per maximal run of collapsed literal content
			literalRun = false;
		}
	}

	while (i < n) {
		const c = pattern[i];

		if (c === '\\') {
			const next = pattern[i + 1] ?? '';
			// \xHH, \x{H+}, \uHHHH, \0 octal-ish escapes encode a specific literal char -- collapse.
			if (next === 'x' || next === 'u' || next === '0') {
				let j = i + 2;
				if (next === 'x' && pattern[j] === '{') {
					while (j < n && pattern[j] !== '}') j++;
					j++;
				} else if (next === 'x') {
					j += 2;
				} else if (next === 'u') {
					if (pattern[j] === '{') {
						while (j < n && pattern[j] !== '}') j++;
						j++;
					} else {
						j += 4;
					}
				}
				literalRun = true;
				i = j;
				continue;
			}
			// Structurally significant escapes: class shorthands, boundaries, backrefs,
			// unicode property escapes, anchors, control-verb-ish -- keep verbatim.
			if (/[dDwWsSbBAZzGkKpPQEcRXCgHhVvN]/.test(next) || /[1-9]/.test(next)) {
				flushLiteral();
				let j = i + 2;
				if ((next === 'k' || next === 'p' || next === 'P' || next === 'g') && pattern[j] === '{') {
					while (j < n && pattern[j] !== '}') j++;
					j++;
				} else if ((next === 'k' || next === 'g') && pattern[j] === '<') {
					while (j < n && pattern[j] !== '>') j++;
					j++;
				} else if (/[1-9]/.test(next)) {
					// multi-digit backreference
					while (j < n && /[0-9]/.test(pattern[j])) j++;
				}
				out += pattern.slice(i, j);
				i = j;
				continue;
			}
			// A plain escaped literal, e.g. \. \* \/ -- collapses like any other literal.
			literalRun = true;
			i += 2;
			continue;
		}

		if (c === '[') {
			// Character class: structurally significant as a unit, but its exact
			// content (which literals/ranges) changes matching power -- keep the
			// whole class verbatim rather than risk collapsing distinct classes.
			flushLiteral();
			let j = i + 1;
			if (pattern[j] === '^') j++;
			if (pattern[j] === ']') j++; // a leading ] is literal inside a class
			while (j < n && pattern[j] !== ']') {
				if (pattern[j] === '\\') j++;
				j++;
			}
			j++;
			out += pattern.slice(i, j);
			i = j;
			continue;
		}

		if (c === '(') {
			flushLiteral();
			// Named-group / modifier-group head, e.g. (?<name> (?'name' (?P<name>
			// (?:  (?=  (?!  (?<=  (?<!  (?>  (?i-sx:  (?(1)  (?1)  (?R)  (?&name)
			let j = i + 1;
			if (pattern[j] === '?') {
				j++;
				// Named group: (?<name>...) or (?'name'...) or (?P<name>...)
				if (pattern[j] === 'P' && pattern[j + 1] === '<') j += 1;
				if (pattern[j] === '<' && pattern[j + 1] !== '=' && pattern[j + 1] !== '!') {
					while (j < n && pattern[j] !== '>') j++;
					j++;
					out += pattern.slice(i, j);
					i = j;
					continue;
				}
				if (pattern[j] === "'") {
					j++;
					while (j < n && pattern[j] !== "'") j++;
					j++;
					out += pattern.slice(i, j);
					i = j;
					continue;
				}
			}
			out += c;
			i++;
			continue;
		}

		if (c === '*' && pattern[i + 1] === '(') {
			// PCRE2 control verb, e.g. (*ACCEPT) (*COMMIT) (*SKIP) -- structurally
			// significant and distinguishable by name, keep verbatim.
			flushLiteral();
			let j = i + 2;
			while (j < n && pattern[j] !== ')') j++;
			j++;
			out += pattern.slice(i, j);
			i = j;
			continue;
		}

		if (c === '{') {
			// A bounded quantifier, e.g. {2,5} -- the bounds change matching power, so keep
			// them verbatim rather than collapsing the digits as an ordinary literal run
			// (which would merge a{2,5} and a{3,8} into the same equivalence class).
			const boundMatch = /^\{\d*(?:,\d*)?\}/.exec(pattern.slice(i));
			if (boundMatch) {
				flushLiteral();
				out += boundMatch[0];
				i += boundMatch[0].length;
				continue;
			}
		}

		if ('.^$|)?*+{}=!<>:,-'.includes(c)) {
			flushLiteral();
			out += c;
			i++;
			continue;
		}

		// A plain literal character.
		literalRun = true;
		i++;
	}
	flushLiteral();
	return out;
}

// -- subject-shape classification ----------------------------------------

function subjectShape(subject) {
	if (typeof subject !== 'string') return 'unknown';
	let sawAstral = false;
	let sawLoneSurrogate = false;
	let sawNonAscii = false;
	for (let i = 0; i < subject.length; i++) {
		const code = subject.charCodeAt(i);
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = subject.charCodeAt(i + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				sawAstral = true;
				i++;
			} else {
				sawLoneSurrogate = true;
			}
		} else if (code >= 0xdc00 && code <= 0xdfff) {
			sawLoneSurrogate = true;
		} else if (code > 0x7f) {
			sawNonAscii = true;
		}
	}
	if (sawLoneSurrogate) return 'lone-surrogate';
	if (sawAstral) return 'astral';
	if (sawNonAscii) return 'bmp-non-ascii';
	return 'ascii';
}

// -- outcome-shape classification ----------------------------------------

function outcomeShape(expected) {
	if (expected === null) return 'no-match';
	const [whole, ...groups] = expected;
	const hasUnsetGroup = groups.some((g) => g === null);
	const lengthShape = whole === '' ? 'zero-length' : 'non-empty';
	return `${lengthShape}${hasUnsetGroup ? '+unset-group' : ''}(groups=${groups.length})`;
}

// -- case-level classification --------------------------------------------

function classify(tuple, resolveSubject) {
	const [pattern, flags, input, esAgree, expected] = tuple;
	const subject = typeof input === 'number' ? resolveSubject(input) : input;
	const sortedFlags = [...flags].sort().join('');
	return [
		normalizePattern(pattern),
		sortedFlags,
		subjectShape(subject),
		outcomeShape(expected),
		esAgree,
	].join('|');
}

// -- per-file dedup --------------------------------------------------------

function loadSubjects(dir, parsed) {
	if (Array.isArray(parsed)) return [];
	if ('subjects' in parsed) return parsed.subjects;
	return [];
}

function dedupCases(tuples, subjects) {
	const resolveSubject = (i) => subjects[i];
	const byClass = new Map();
	for (const tuple of tuples) {
		const key = classify(tuple, resolveSubject);
		let bucket = byClass.get(key);
		if (!bucket) {
			bucket = [];
			byClass.set(key, bucket);
		}
		bucket.push(tuple);
	}
	const kept = [];
	let classesOverLimit = 0;
	for (const bucket of byClass.values()) {
		if (bucket.length > KEEP_PER_CLASS) classesOverLimit++;
		kept.push(...bucket.slice(0, KEEP_PER_CLASS));
	}
	return { kept, classCount: byClass.size, classesOverLimit };
}

function compactSubjects(tuples, subjects) {
	const used = new Map(); // oldIndex -> newIndex
	const newSubjects = [];
	const remapped = tuples.map((tuple) => {
		const [pattern, flags, input, esAgree, expected] = tuple;
		if (typeof input !== 'number') return tuple;
		let newIndex = used.get(input);
		if (newIndex === undefined) {
			newIndex = newSubjects.length;
			newSubjects.push(subjects[input]);
			used.set(input, newIndex);
		}
		return [pattern, flags, newIndex, esAgree, expected];
	});
	return { remapped, newSubjects };
}

// -- files -------------------------------------------------------------

const targets = [
	{ file: 'pcre2-testinput1.json', dir: FIXTURES_DIR, hasSubjects: 'subjects' },
	{
		file: 'rust-regex/rust-regex-corpus.json',
		dir: path.join(FIXTURES_DIR, 'rust-regex'),
		hasSubjects: 'subjects',
	},
	{ file: 'realistic-patterns.json', dir: FIXTURES_DIR, hasSubjects: 'subjects' },
	{ file: 'curated-cases.json', dir: FIXTURES_DIR, hasSubjects: 'subjects', hasDivergences: true },
];

let totalBefore = 0;
let totalAfter = 0;

for (const target of targets) {
	if (ONLY_FILES && !ONLY_FILES.has(target.file)) continue;
	const filePath = path.join(FIXTURES_DIR, target.file);
	// A category with zero retained cases has its fixture removed by build-corpus.mjs's
	// manifest cleanup before this script runs -- not an error, just nothing to dedup.
	if (!fs.existsSync(filePath)) {
		console.log(`${target.file}: skipped (no fixture on disk)`);
		continue;
	}
	const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
	const subjects = loadSubjects(target.dir, parsed);

	const { kept, classCount, classesOverLimit } = dedupCases(parsed.cases, subjects);
	totalBefore += parsed.cases.length;
	totalAfter += kept.length;

	console.log(
		`${target.file}: ${parsed.cases.length} -> ${kept.length} cases ` +
			`(${classCount} classes, ${classesOverLimit} over the keep-${KEEP_PER_CLASS} limit)` +
			(target.hasDivergences ? `, divergences untouched (${parsed.divergences.length})` : ''),
	);

	if (!WRITE) continue;

	if (target.hasSubjects === 'subjects') {
		const { remapped, newSubjects } = compactSubjects(kept, subjects);
		parsed.cases = remapped;
		parsed.subjects = newSubjects;
	} else {
		parsed.cases = kept;
	}

	fs.writeFileSync(filePath, JSON.stringify(parsed));
}

console.log(`\nTOTAL: ${totalBefore} -> ${totalAfter} cases`);
if (!WRITE) console.log('(report-only; pass --write to apply)');
