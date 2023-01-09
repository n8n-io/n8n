import { alphaCompletions } from '../alpha.completions';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

const EXPLICIT = false;

test('should return alphabetic char completion options: D', () => {
	const doc = '{{ D }}';
	const position = doc.indexOf('D') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = alphaCompletions(context);

	if (!result) throw new Error('Expected D completion options');

	const { options, from } = result;

	expect(options.map((o) => o.label)).toEqual(['DateTime']);
	expect(from).toEqual(position - 1);
});

test('should not return alphabetic char completion options: $input.D', () => {
	const doc = '{{ $input.D }}';
	const position = doc.indexOf('D') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = alphaCompletions(context);

	expect(result).toBeNull();
});
