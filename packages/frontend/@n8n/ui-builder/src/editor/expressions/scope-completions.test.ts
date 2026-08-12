import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

import { uiScopeCompletions } from './scope-completions';
import type { UiScope } from '../../core/types';

const scope: UiScope = {
	$state: { title: 'Hi', rows: [{ name: 'Ada', age: 36 }] },
	$loading: { save: false },
	$item: { name: 'Ada' },
	$index: 0,
};

function complete(doc: string, explicit = false) {
	const state = EditorState.create({ doc });
	const context = new CompletionContext(state, doc.length, explicit);
	return uiScopeCompletions(() => scope)(context);
}

function labels(doc: string, explicit = false) {
	return complete(doc, explicit)?.options.map((option) => option.label);
}

describe('uiScopeCompletions', () => {
	it('offers the names bound in the live scope', () => {
		expect(labels('$')).toEqual(['$state', '$item', '$index', '$loading']);
	});

	it('stays quiet on a bare word unless asked', () => {
		expect(complete('tit')).toBeNull();
		expect(labels('tit', true)).toContain('$state');
	});

	it('drills into the live state', () => {
		expect(labels('$state.')).toEqual(['title', 'rows']);
	});

	it('drills through an array index into the element that is there', () => {
		expect(labels('$state.rows[0].')).toEqual(['name', 'age']);
	});

	it('offers length on an array', () => {
		expect(labels('$state.rows.')).toEqual(['length']);
	});

	it('completes an enclosing repeat item', () => {
		expect(labels('$item.')).toEqual(['name']);
	});

	it('gives up on a path it cannot walk rather than guessing', () => {
		expect(complete('$state.rows.filter(Boolean).')).toBeNull();
	});

	it('reports the value kind alongside each key', () => {
		expect(complete('$state.')?.options).toEqual([
			expect.objectContaining({ label: 'title', detail: 'string' }),
			expect.objectContaining({ label: 'rows', detail: 'array(1)' }),
		]);
	});
});
