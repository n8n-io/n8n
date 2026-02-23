import { CompletionContext } from '@codemirror/autocomplete';
import { EditorSelection, EditorState } from '@codemirror/state';
import { useItemFieldCompletions } from './itemField.completions';

describe('inputMethodCompletions', () => {
	test('should return completions for $input.item.|', () => {
		const { inputMethodCompletions } = useItemFieldCompletions('javaScript');
		expect(inputMethodCompletions(createContext('$input.item.|'))).toEqual({
			from: 0,
			options: [
				{
					info: expect.any(Function),
					label: '$input.item.json',
					type: 'variable',
				},

				{
					info: expect.any(Function),
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
					info: expect.any(Function),
					label: '$input.first().json',
					type: 'variable',
				},

				{
					info: expect.any(Function),
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
					info: expect.any(Function),
					label: '$input.all()[1].json',
					type: 'variable',
				},

				{
					info: expect.any(Function),
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
