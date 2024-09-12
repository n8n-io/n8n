import { CompletionContext } from '@codemirror/autocomplete';
import { EditorSelection, EditorState } from '@codemirror/state';
import { useItemFieldCompletions } from '../itemField.completions';

describe('inputMethodCompletions', () => {
	test('should return completions for $input.item.|', () => {
		const { inputMethodCompletions } = useItemFieldCompletions('javaScript');
		expect(inputMethodCompletions(createContext('$input.item.|'))).toEqual({
			from: 0,
			options: [
				{
					info: 'Returns the JSON input data to the current node, for the current item. Shorthand for <code>$input.item.json</code>.',
					label: '$input.item.json',
					type: 'variable',
				},

				{
					info: 'Returns any binary input data to the current node, for the current item. Shorthand for <code>$input.item.binary</code>.',
					label: '$input.item.binary',
					type: 'variable',
				},
			],
		});
	});

	test('should return completions for $input.first().|', () => {
		const { inputMethodCompletions } = useItemFieldCompletions('javaScript');
		expect(inputMethodCompletions(createContext('$input.first().|'))).toEqual({
			from: 0,
			options: [
				{
					info: 'Returns the JSON input data to the current node, for the current item. Shorthand for <code>$input.item.json</code>.',
					label: '$input.first().json',
					type: 'variable',
				},

				{
					info: 'Returns any binary input data to the current node, for the current item. Shorthand for <code>$input.item.binary</code>.',
					label: '$input.first().binary',
					type: 'variable',
				},
			],
		});
	});

	test('should return completions for $input.all()[1].|', () => {
		const { inputMethodCompletions } = useItemFieldCompletions('javaScript');
		expect(inputMethodCompletions(createContext('$input.all()[1].|'))).toEqual({
			from: 0,
			options: [
				{
					info: 'Returns the JSON input data to thqe current node, for the current item. Shorthand for <code>$input.item.json</code>.',
					label: '$input.all()[1].json',
					type: 'variable',
				},

				{
					info: 'Returns any binary input data to the current node, for the current item. Shorthand for <code>$input.item.binary</code>.',
					label: '$input.all()[1].binary',
					type: 'variable',
				},
			],
		});
	});
});

export function createContext(docWithCursor: string) {
	const cursorPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, cursorPosition) + docWithCursor.slice(cursorPosition + 1);

	return new CompletionContext(
		EditorState.create({ doc, selection: EditorSelection.single(cursorPosition) }),
		cursorPosition,
		false,
	);
}
