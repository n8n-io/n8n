import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { dateTimeOptions, nowTodayOptions, luxonCompletions } from '../luxon.completions';

const EXPLICIT = false;

test('should return luxon completion options: $now, $today', () => {
	['$now', '$today'].forEach((luxonVar) => {
		const doc = `{{ ${luxonVar}. }}`;
		const position = doc.indexOf('.') + 1;
		const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

		const result = luxonCompletions(context);

		if (!result) throw new Error(`Expected luxon ${luxonVar} completion options`);

		const { options, from } = result;

		expect(options.map((o) => o.label)).toEqual(nowTodayOptions().map((o) => o.label));
		expect(from).toEqual(position);
	});
});

test('should return luxon completion options: DateTime', () => {
	const doc = '{{ DateTime. }}';
	const position = doc.indexOf('.') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = luxonCompletions(context);

	if (!result) throw new Error('Expected luxon completion options');

	const { options, from } = result;

	expect(options.map((o) => o.label)).toEqual(dateTimeOptions().map((o) => o.label));
	expect(from).toEqual(position);
});
