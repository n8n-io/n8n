import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { useItemFieldCompletions } from '@/components/CodeNodeEditor/completions/itemField.completions';

describe('itemFieldCompletions', () => {
	let context: CompletionContext;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	describe('matcherItemFieldCompletions', () => {
		test('should return null if no match found', () => {
			const doc = '{{ $input.noMatch.| }}';
			const cursorPosition = doc.indexOf('|');
			const state = EditorState.create({
				doc: doc.replace('|', ''),
				selection: { anchor: cursorPosition },
				extensions: [n8nLang()],
			});
			context = new CompletionContext(state, cursorPosition, true);

			const result = useItemFieldCompletions('javaScript').matcherItemFieldCompletions(
				context,
				'$input.noMatch',
				{ '$input.item': 'item' },
			);

			expect(result).toBeNull();
		});
	});

	describe('inputMethodCompletions', () => {
		test('should return completions for $input.first().', () => {
			const doc = '{{ $input.first().| }}';
			const cursorPosition = doc.indexOf('|');
			const state = EditorState.create({
				doc: doc.replace('|', ''),
				selection: { anchor: cursorPosition },
				extensions: [n8nLang()],
			});
			context = new CompletionContext(state, cursorPosition, true);

			const result = useItemFieldCompletions('javaScript').inputMethodCompletions(context);

			expect(result).not.toBeNull();
			expect(result?.options).toHaveLength(2);
			expect(result?.options[0].label).toBe('$input.first().json');
			expect(result?.options[1].label).toBe('$input.first().binary');
		});

		test('should return null if no match found', () => {
			const doc = '{{ $input.noMatch().| }}';
			const cursorPosition = doc.indexOf('|');
			const state = EditorState.create({
				doc: doc.replace('|', ''),
				selection: { anchor: cursorPosition },
				extensions: [n8nLang()],
			});
			context = new CompletionContext(state, cursorPosition, true);

			const result = useItemFieldCompletions('javaScript').inputMethodCompletions(context);

			expect(result).toBeNull();
		});
	});

	describe('selectorMethodCompletions', () => {
		test("should return completions for $('nodeName').first().", () => {
			const doc = "{{ $('nodeName').first().| }}";
			const cursorPosition = doc.indexOf('|');
			const state = EditorState.create({
				doc: doc.replace('|', ''),
				selection: { anchor: cursorPosition },
				extensions: [n8nLang()],
			});
			context = new CompletionContext(state, cursorPosition, true);

			const result = useItemFieldCompletions('javaScript').selectorMethodCompletions(context);

			expect(result).not.toBeNull();
			expect(result?.options).toHaveLength(2);
			expect(result?.options[0].label).toBe("$('nodeName').first().json");
			expect(result?.options[1].label).toBe("$('nodeName').first().binary");
		});

		test('should return null if no match found', () => {
			const doc = "{{ $('noMatch').noMatch().| }}";
			const cursorPosition = doc.indexOf('|');
			const state = EditorState.create({
				doc: doc.replace('|', ''),
				selection: { anchor: cursorPosition },
				extensions: [n8nLang()],
			});
			context = new CompletionContext(state, cursorPosition, true);

			const result = useItemFieldCompletions('javaScript').selectorMethodCompletions(context);

			expect(result).toBeNull();
		});
	});
});
