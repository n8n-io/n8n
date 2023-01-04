import { alphaCompletions } from '../alpha.completions';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

const EXPLICIT = false;

test('should return alphabetic char completion options: D', () => {
	setActivePinia(createTestingPinia());

	const doc = '{{ D }}';
	const position = doc.indexOf('D') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = alphaCompletions(context);

	if (!result) throw new Error('Expected D completion options');

	const { options, from } = result;

	expect(options.map((o) => o.label)).toEqual(['DateTime']);
	expect(from).toEqual(position - 1);
});
