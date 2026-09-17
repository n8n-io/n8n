import { describe, expect, it } from 'vitest';

import { decide } from '../decide';
import { buildRequest, TARGET_REF_QUESTION } from '../questions';
import {
	MAX_CHOICE_OPTIONS,
	parseOptionLabels,
	parseSnapshot,
	selectChoosableElements,
} from '../snapshot-elements';
import type { Answer } from '../types';

const choice = (value: string, confidence: number): Answer => ({
	type: 'choice',
	choice: value,
	confidence,
	probabilities: { [value]: confidence },
});

const noul = (value: number): Answer => ({ type: 'noul', noul: value });

const quietGuards = (): Record<string, Answer> => ({
	guard_page_loading: noul(0.01),
	guard_page_error: noul(0.01),
	guard_auth_required: noul(0.01),
	guard_value_absent: noul(0.01),
	guard_step_complete: noul(0.01),
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

describe('selectChoosableElements', () => {
	const refs = (count: number, role: string, from = 1) =>
		Array.from({ length: count }, (_, i) => `  - ${role} "Item ${i + from}" [ref=e${i + from}]`);

	it('offers every ref while the list fits, filtering nothing', () => {
		const elements = parseSnapshot(
			[...refs(100, 'button'), ...refs(50, 'heading', 101)].join('\n'),
		);

		const result = selectChoosableElements(elements);

		expect(result.tooMany).toBe(false);
		expect(result.elements).toHaveLength(150);
	});

	it('drops non-actionable refs only once the list is over the cap', () => {
		const elements = parseSnapshot(
			[...refs(200, 'button'), ...refs(100, 'heading', 201)].join('\n'),
		);

		const result = selectChoosableElements(elements);

		expect(result.tooMany).toBe(false);
		expect(result.elements).toHaveLength(200);
		expect(result.elements.every((element) => element.role === 'button')).toBe(true);
	});

	it('reports tooMany when even the actionable refs exceed the cap', () => {
		const elements = parseSnapshot(refs(MAX_CHOICE_OPTIONS + 1, 'button').join('\n'));

		expect(selectChoosableElements(elements).tooMany).toBe(true);
	});

	it('never builds a request above the API cap', () => {
		const elements = parseSnapshot(refs(MAX_CHOICE_OPTIONS, 'button').join('\n'));
		const { elements: choosable } = selectChoosableElements(elements);

		const { questions } = buildRequest(
			{
				goal: 'g',
				step: 's',
				url: 'https://example.com',
				title: 't',
				snapshot: '',
			},
			choosable,
		);

		for (const question of Object.values(questions)) {
			if (question.type !== 'choice') continue;
			expect(Object.keys(question.criteria).length).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS);
		}
	});

	it('asks for the target element once, not once per action', () => {
		const snapshot = '- button "A" [ref=e1]\n- button "B" [ref=e2]';
		const { questions } = buildRequest(
			{ goal: 'g', step: 's', url: 'https://example.com', title: 't', snapshot },
			parseSnapshot(snapshot),
		);

		const refQuestions = Object.keys(questions).filter((name) => name.endsWith('_ref'));
		expect(refQuestions).toEqual([TARGET_REF_QUESTION]);
	});

	it('omits an over-long select option list rather than truncating it', () => {
		const options = Array.from(
			{ length: MAX_CHOICE_OPTIONS + 1 },
			(_, i) => `  - option "Zone ${i}"`,
		).join('\n');
		const snapshot = `- combobox "Timezone" [ref=e1]:\n${options}`;

		const { questions } = buildRequest(
			{ goal: 'g', step: 's', url: 'https://example.com', title: 't', snapshot },
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
			target_ref: choice('e13', 0.9),
		});

		expect(decision).toMatchObject({ kind: 'execute', action: 'browser_click', ref: 'e13' });
	});

	it('takes the least certain judgement as the action confidence', () => {
		const decision = decide(
			{ ...quietGuards(), action: choice('browser_click', 0.99), target_ref: choice('e13', 0.72) },
			0.7,
		);

		expect(decision).toMatchObject({ kind: 'execute', confidence: 0.72 });
	});

	it('holds when the least certain part falls below the bar', () => {
		const decision = decide(
			{ ...quietGuards(), action: choice('browser_click', 0.99), target_ref: choice('e13', 0.4) },
			0.7,
		);

		expect(decision).toMatchObject({
			kind: 'handback',
			reason: 'low_confidence',
			suggestion: { action: 'browser_click', ref: 'e13' },
		});
	});

	it('lets a tripped guard override even a certain action', () => {
		const decision = decide({
			...quietGuards(),
			guard_auth_required: noul(0.95),
			action: choice('browser_click', 1),
			target_ref: choice('e13', 1),
		});

		expect(decision).toMatchObject({ kind: 'handback', reason: 'guard' });
	});

	it('hands back a typing step with the element it found, so the model can finish it', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_type', 0.95),
			target_ref: choice('e35', 0.95),
		});

		expect(decision).toMatchObject({
			kind: 'handback',
			reason: 'needs_text',
			suggestion: { action: 'browser_type', ref: 'e35' },
		});
	});

	it('carries the chosen option through for a select', () => {
		const decision = decide({
			...quietGuards(),
			action: choice('browser_select', 0.9),
			target_ref: choice('e32', 0.9),
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
			target_ref: choice('e32', 0.9),
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
