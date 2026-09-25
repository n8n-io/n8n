import { describe, expect, it } from 'vitest';

import { decide, pickRef } from '../decide';
import { parseDomSnapshot, toSnapshotElements } from '../dom-snapshot';
import {
	buildRequest,
	pagedTargetRefKey,
	TARGET_REF_NONE,
	UNSPECIFIED_CHOICE_QUESTION,
} from '../questions';
import {
	actionCandidates,
	MAX_CANDIDATES,
	MAX_CHOICE_OPTIONS,
	parseOptionLabels,
	parseSnapshot,
	toChoiceCriteria,
} from '../snapshot-elements';
import type { Answer } from '../types';

const choice = (value: string, confidence: number): Answer => ({
	type: 'choice',
	choice: value,
	confidence,
	probabilities: { [value]: confidence },
});

const noul = (value: number): Answer => ({ type: 'noul', noul: value });

const distribution = (probabilities: Record<string, number>): Answer => {
	const [top] = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
	return { type: 'choice', choice: top[0], confidence: top[1], probabilities };
};

const quietGuards = (): Record<string, Answer> => ({
	guard_page_loading: noul(0.01),
	guard_page_error: noul(0.01),
	guard_auth_required: noul(0.01),
	guard_value_absent: noul(0.01),
	guard_step_complete: noul(0.01),
	[UNSPECIFIED_CHOICE_QUESTION]: noul(0.01),
});

describe('parseSnapshot', () => {
	it('reads role, name, value and ref through indentation and extra attributes', () => {
		const tree = [
			'- main:',
			'  - heading "Credentials" [level=1] [ref=e1]',
			'  - button "Create" [disabled] [ref=e2]',
			'  - combobox "Type" [ref=e3]: Web application',
			'  - textbox [ref=e4]',
			'  - row "Name Created":',
			'  - button "Delete: all" [ref=e5]',
			'  - link "Docs" @e6',
		].join('\n');

		expect(parseSnapshot(tree)).toEqual([
			{ ref: 'e1', role: 'heading', name: 'Credentials' },
			{ ref: 'e2', role: 'button', name: 'Create' },
			{ ref: 'e3', role: 'combobox', name: 'Type', value: 'Web application' },
			{ ref: 'e4', role: 'textbox', name: '' },
			{ ref: 'e5', role: 'button', name: 'Delete: all' },
			{ ref: 'e6', role: 'link', name: 'Docs' },
		]);
	});

	it('collects select option labels, which carry no ref of their own', () => {
		const tree = '- combobox "Type" [ref=e3]:\n  - option "Web application"\n  - option "Android"';

		expect(parseOptionLabels(tree)).toEqual(['Web application', 'Android']);
	});
});

describe('dom snapshot', () => {
	it('maps probe output onto the candidate shape', () => {
		const probe = parseDomSnapshot({
			url: 'https://example.com',
			title: 'Book',
			elements: [
				{ id: 'n1', role: 'gridcell', name: '20', context: 'October 2026' },
				{ id: 'n2', role: 'textbox', name: 'Where to?', value: 'London' },
			],
			omitted: 0,
		});
		if (!probe) throw new Error('expected a parsed snapshot');

		expect(toSnapshotElements(probe)).toEqual([
			{ ref: 'n1', role: 'gridcell', name: '20', context: 'October 2026' },
			{ ref: 'n2', role: 'textbox', name: 'Where to?', value: 'London' },
		]);
	});

	it('redacts a secret a field happened to hold, before it reaches the vendor', () => {
		// Redaction runs before truncation: the patterns need the whole token, so
		// cutting the value first would leave an unmatched fragment behind.
		const probe = parseDomSnapshot({
			url: 'https://example.com',
			title: 't',
			elements: [
				{
					id: 'n1',
					role: 'textbox',
					name: 'Token',
					value: `sk-ant-api03-${'A1b2C3d4E5'.repeat(9)}`,
				},
			],
			omitted: 0,
		});
		if (!probe) throw new Error('expected a parsed snapshot');

		const [element] = toSnapshotElements(probe);
		expect(element.value).not.toContain('sk-ant-api03');
	});

	it('returns null for output it cannot trust, so the caller can fall back', () => {
		expect(parseDomSnapshot(null)).toBeNull();
		expect(parseDomSnapshot({ url: 'x' })).toBeNull();
	});
});

describe('disabled controls', () => {
	const probe = (elements: Array<Record<string, unknown>>) => {
		const parsed = parseDomSnapshot({ url: 'https://x.test', title: 't', elements, omitted: 0 });
		if (!parsed) throw new Error('expected a parsed snapshot');
		return toSnapshotElements(parsed);
	};

	it('keeps a disabled submit as page context rather than dropping it', () => {
		const [submit] = probe([
			{ id: 'n1', role: 'button', name: 'Create secret key', disabled: true },
		]);

		expect(submit).toMatchObject({ ref: 'n1', disabled: true });
		expect(submit.state).toContain('disabled=true');
	});

	it('reports a required field that is still empty', () => {
		const [field] = probe([{ id: 'n2', role: 'combobox', name: 'Expiration', required: true }]);

		expect(field.state).toContain('required=true');
	});

	it('never offers a disabled control as a target', () => {
		// The failure this prevents: with the submit hidden, the best remaining
		// goal-match was the button that opened the dialog, so the loop clicked it
		// again from inside the dialog.
		const elements = probe([
			{ id: 'n1', role: 'button', name: 'Create new secret key' },
			{ id: 'n2', role: 'button', name: 'Create secret key', disabled: true },
		]);

		const { questions, state } = buildRequest(
			{ goal: 'g', url: 'https://x.test', title: 't', snapshot: '' },
			elements,
		);

		const page = questions[pagedTargetRefKey(0)];
		const offered = page.type === 'choice' ? Object.keys(page.criteria) : [];
		expect(offered).toContain('n1');
		expect(offered).not.toContain('n2');
		// Still visible to the model as state, which is the whole point.
		expect(JSON.stringify(state.elements)).toContain('n2');
	});

	it('drops disabled controls from actionCandidates too', () => {
		const kept = actionCandidates([
			{ ref: 'n1', role: 'button', name: 'Go' },
			{ ref: 'n2', role: 'button', name: 'Blocked', disabled: true },
		]).elements.map((element) => element.ref);

		expect(kept).toEqual(['n1']);
	});
});

describe('ancestor context', () => {
	it('tells repeated labels apart by their nearest named ancestor', () => {
		const tree = [
			'- table [ref=e1]:',
			'  - row "Casa Flora" [ref=e2]:',
			'    - button "Edit" [ref=e3]',
			'  - row "Hotel Azul" [ref=e4]:',
			'    - button "Edit" [ref=e5]',
		].join('\n');

		const criteria = toChoiceCriteria(parseSnapshot(tree));

		expect(criteria.e3).toBe('button "Edit" in row "Casa Flora"');
		expect(criteria.e5).toBe('button "Edit" in row "Hotel Azul"');
	});

	it('uses an unaddressable ancestor too — a row need not carry a ref', () => {
		const tree = '- row "Name Created":\n  - cell "Value" [ref=e9]';

		expect(parseSnapshot(tree)[0].context).toBe('row "Name Created"');
	});

	it('leaves context off when the ancestor repeats the element name', () => {
		const tree = '- region "Client secrets" [ref=e1]:\n  - button "Client secrets" [ref=e2]';

		expect(parseSnapshot(tree)[1].context).toBeUndefined();
	});
});

describe('actionCandidates', () => {
	it('drops wrappers and keeps leaves, including a clickable generic', () => {
		const tree = [
			'- main [ref=e1]:',
			'  - banner [ref=e2]:',
			'    - heading "Title" [ref=e3]',
			'  - generic [ref=e4]:',
			'    - generic "Click me" [ref=e5]',
			'  - button "Save" [ref=e6]',
		].join('\n');

		const kept = actionCandidates(parseSnapshot(tree)).elements.map((element) => element.ref);

		// e1, e2 and e4 enclose other refs; a layout generic is never a target,
		// but the leaf generic at e5 may well be a clickable div.
		expect(kept).toEqual(['e3', 'e5', 'e6']);
	});

	it('keeps everything on a flat page', () => {
		const tree = '- button "A" [ref=e1]\n- button "B" [ref=e2]';

		expect(actionCandidates(parseSnapshot(tree)).elements).toHaveLength(2);
	});

	it('caps the total and reports the overflow rather than paging past the budget', () => {
		const tree = Array.from(
			{ length: MAX_CANDIDATES + 30 },
			(_, i) => `- button "Item ${i + 1}" [ref=e${i + 1}]`,
		).join('\n');

		const { elements, omitted } = actionCandidates(parseSnapshot(tree));

		expect(elements).toHaveLength(MAX_CANDIDATES);
		expect(omitted).toBe(30);
	});
});

describe('ref paging', () => {
	const refs = (count: number) =>
		Array.from({ length: count }, (_, i) => `- button "Item ${i + 1}" [ref=e${i + 1}]`).join('\n');

	const briefFor = (snapshot: string) => ({
		goal: 'g',
		url: 'https://example.com',
		title: 't',
		snapshot,
	});

	const refQuestionsOf = (snapshot: string) => {
		const { questions } = buildRequest(briefFor(snapshot), parseSnapshot(snapshot));
		return Object.entries(questions).filter(([name]) => name.startsWith('target_ref'));
	};

	it('puts every ref in exactly one page, each within the API cap', () => {
		const total = MAX_CHOICE_OPTIONS * 2 + 40;
		const pages = refQuestionsOf(refs(total));

		const offered = new Set<string>();
		for (const [, question] of pages) {
			if (question.type !== 'choice') continue;
			const options = Object.keys(question.criteria);
			expect(options.length).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS);
			for (const option of options) {
				if (option === TARGET_REF_NONE) continue;
				// No ref may appear twice: a duplicate would split its probability
				// across two questions and depress the confidence of the right answer.
				expect(offered.has(option)).toBe(false);
				offered.add(option);
			}
		}
		expect(offered.size).toBe(total);
	});

	it('names pages by index, so the reader can walk them', () => {
		const pages = refQuestionsOf(refs(MAX_CHOICE_OPTIONS * 2 + 40));

		expect(pages.map(([name]) => name)).toEqual([0, 1, 2].map(pagedTargetRefKey));
	});

	it('offers a "none" escape on every page', () => {
		for (const [, question] of refQuestionsOf(refs(MAX_CHOICE_OPTIONS * 2 + 40))) {
			if (question.type !== 'choice') continue;
			expect(question.criteria[TARGET_REF_NONE]).toBeDefined();
		}
	});

	it('asks nothing about refs for a page with no elements', () => {
		expect(refQuestionsOf('(empty page)')).toEqual([]);
	});
});

describe('pickRef', () => {
	it('takes the most confident answer across pages, not the first', () => {
		const picked = pickRef({
			[pagedTargetRefKey(0)]: choice('e1', 0.2),
			[pagedTargetRefKey(1)]: choice('e300', 0.95),
			[pagedTargetRefKey(2)]: choice('e600', 0.4),
		});

		expect(picked?.choice).toBe('e300');
	});

	it('ignores a page that answered "none"', () => {
		const picked = pickRef({
			[pagedTargetRefKey(0)]: choice(TARGET_REF_NONE, 0.99),
			[pagedTargetRefKey(1)]: choice('e300', 0.8),
		});

		expect(picked?.choice).toBe('e300');
	});

	it('reads the runner-up when "none" wins by a nose, instead of giving up', () => {
		// Measured shape: `none` lands just behind the correct element, so letting
		// it win outright aborted runs on variance alone.
		const picked = pickRef({
			[pagedTargetRefKey(0)]: distribution({ none: 0.44, n69: 0.42, n70: 0.14 }),
		});

		expect(picked?.choice).toBe('n69');
		expect(picked?.confidence).toBeCloseTo(0.42);
	});

	it('prefers a confident real answer on another page over a runner-up', () => {
		const picked = pickRef({
			[pagedTargetRefKey(0)]: distribution({ none: 0.6, n1: 0.4 }),
			[pagedTargetRefKey(1)]: distribution({ n300: 0.9, none: 0.1 }),
		});

		expect(picked?.choice).toBe('n300');
	});

	it('returns nothing when no page holds a real option with any mass', () => {
		expect(
			pickRef({
				[pagedTargetRefKey(0)]: distribution({ none: 0.98, n1: 0.02 }),
				[pagedTargetRefKey(1)]: distribution({ none: 0.99, n2: 0.01 }),
			}),
		).toBeUndefined();
	});
});

describe('select options', () => {
	it('omits an over-long select option list rather than truncating it', () => {
		const options = Array.from(
			{ length: MAX_CHOICE_OPTIONS + 1 },
			(_, i) => `  - option "Zone ${i}"`,
		).join('\n');
		const snapshot = `- combobox "Timezone" [ref=e1]:\n${options}`;

		const { questions } = buildRequest(
			{ goal: 'g', url: 'https://example.com', title: 't', snapshot },
			parseSnapshot(snapshot),
		);

		expect(questions.select_value).toBeUndefined();
	});
});

describe('decide', () => {
	it('executes a confident action with its element', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_click', 0.95),
			[pagedTargetRefKey(0)]: choice('e13', 0.9),
		});

		expect(decision).toMatchObject({ kind: 'execute', action: 'browser_click', ref: 'e13' });
	});

	it('takes the least certain judgement as the action confidence', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_click', 0.99),
			[pagedTargetRefKey(0)]: choice('e13', 0.72),
		});

		expect(decision).toMatchObject({ kind: 'execute', confidence: 0.72 });
	});

	it('acts on the top answer even when confidence is low', () => {
		// Confidence tracks how many options were on offer, not correctness, so a
		// dense page must not be refused on the strength of that number alone.
		const decision = decide({
			...quietGuards(),
			action: choice('browser_click', 0.99),
			[pagedTargetRefKey(0)]: choice('e13', 0.4),
		});

		expect(decision).toMatchObject({
			kind: 'execute',
			action: 'browser_click',
			ref: 'e13',
			confidence: 0.4,
		});
	});

	it('hands back when every page answered "none"', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_click', 0.99),
			[pagedTargetRefKey(0)]: choice(TARGET_REF_NONE, 0.9),
		});

		expect(decision).toMatchObject({ kind: 'handback', reason: 'unclear' });
	});

	it('lets a tripped guard override even a certain action', () => {
		const decision = decide({
			...quietGuards(),
			guard_auth_required: noul(0.95),
			action: choice('browser_click', 1),
			[pagedTargetRefKey(0)]: choice('e13', 1),
		});

		expect(decision).toMatchObject({ kind: 'handback', reason: 'guard' });
	});

	it('hands back a choice the goal never made, naming the control', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_click', 0.95),
			[pagedTargetRefKey(0)]: choice('e9', 0.9),
			[UNSPECIFIED_CHOICE_QUESTION]: noul(0.9),
		});

		expect(decision).toMatchObject({
			kind: 'handback',
			reason: 'needs_choice',
			suggestion: { action: 'browser_click', ref: 'e9' },
		});
	});

	it('acts when the choice guard is quiet', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_click', 0.95),
			[pagedTargetRefKey(0)]: choice('e9', 0.9),
		});

		expect(decision).toMatchObject({ kind: 'execute', action: 'browser_click', ref: 'e9' });
	});

	it('executes a typing step; the value is written by the caller, not decided here', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_type', 0.95),
			[pagedTargetRefKey(0)]: choice('e35', 0.95),
		});

		expect(decision).toMatchObject({ kind: 'execute', action: 'browser_type', ref: 'e35' });
	});

	it('still hands back a navigation, which needs a URL', () => {
		const decision = decide({ ...quietGuards(), action: choice('browser_navigate', 0.9) });

		expect(decision).toMatchObject({ kind: 'handback', reason: 'needs_url' });
	});

	it('carries the chosen option through for a select', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_select', 0.9),
			[pagedTargetRefKey(0)]: choice('e32', 0.9),
			select_value: choice('Web application', 0.88),
		});

		expect(decision).toMatchObject({
			kind: 'execute',
			action: 'browser_select',
			ref: 'e32',
			value: 'Web application',
			confidence: 0.88,
		});
	});

	it('refuses a select the page offered no options for', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_select', 0.9),
			[pagedTargetRefKey(0)]: choice('e32', 0.9),
		});

		expect(decision).toMatchObject({ kind: 'handback', reason: 'unclear' });
	});

	it('executes an action that needs no element', () => {
		const decision = decide({ ...quietGuards(), action: choice('browser_reload', 0.9) });

		expect(decision).toMatchObject({ kind: 'execute', action: 'browser_reload' });
	});

	it('hands back on escalate and on a missing router answer', () => {
		expect(decide({ ...quietGuards(), action: choice('escalate', 0.8) })).toMatchObject({
			kind: 'handback',
			reason: 'unclear',
		});
		expect(decide(quietGuards())).toMatchObject({ kind: 'handback', reason: 'unclear' });
	});
});
