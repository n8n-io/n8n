import { escapeForStringLiteral, matchText, typescriptCompletionSource } from '../completions';
import { typescriptWorkerFacet } from '../facet';
import { CompletionContext, type Completion } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { n8nLang } from '@/features/shared/editors/plugins/codemirror/n8nLang';
import { WORKFLOW_DOCUMENT_FACET } from '@/features/shared/editors/plugins/codemirror/completions/constants';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import type { LanguageServiceWorker } from '@/features/shared/editors/plugins/codemirror/typescript/types';
import type * as Comlink from 'comlink';
import { mock } from 'vitest-mock-extended';

describe('matchText', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it.each([
		{ node: '$(|)', expected: '(' },
		{ node: '$("|', expected: '"' },
		{ node: "$('|", expected: "'" },
		{ node: '$(""|', expected: '"' },
		{ node: "$('|", expected: "'" },
		{ node: '$("|")', expected: '"' },
		{ node: "$('|')", expected: "'" },
		{ node: '$("|)', expected: '"' },
		{ node: '$("No|")', expected: 'No' },
		{ node: "$('No|')", expected: 'No' },
		{ node: '$("N|")', expected: 'N' },
		{ node: "$('N|')", expected: 'N' },
	])('should match on previous node: $node', ({ node, expected }) => {
		const cursorPosition = node.indexOf('|');
		const state = EditorState.create({
			doc: node.replace('|', ''),
			selection: { anchor: cursorPosition },
			extensions: [n8nLang()],
		});
		const context = new CompletionContext(state, cursorPosition, false);

		expect(matchText(context)?.text).toEqual(expected);
	});
});

describe('escapeForStringLiteral', () => {
	it.each([
		{ value: 'content-type', quote: '"' as const, expected: 'content-type' },
		{ value: 'say "hi"', quote: '"' as const, expected: 'say \\"hi\\"' },
		{ value: "it's", quote: '"' as const, expected: "it's" },
		{ value: 'say "hi"', quote: "'" as const, expected: 'say "hi"' },
		{ value: "it's", quote: "'" as const, expected: "it\\'s" },
		{ value: 'back\\slash', quote: '"' as const, expected: 'back\\\\slash' },
		{ value: 'back\\slash', quote: "'" as const, expected: 'back\\\\slash' },
		{ value: '\\"', quote: "'" as const, expected: '\\\\"' },
		{ value: 'line\nbreak', quote: "'" as const, expected: 'line\\nbreak' },
		{ value: 'say "hi"', quote: '`' as const, expected: 'say "hi"' },
		{ value: "it's", quote: '`' as const, expected: "it's" },
		{ value: 'a`b', quote: '`' as const, expected: 'a\\`b' },
		{ value: 'x${y}', quote: '`' as const, expected: 'x\\${y}' },
		{ value: '$y', quote: '`' as const, expected: '$y' },
		{ value: 'back\\slash', quote: '`' as const, expected: 'back\\\\slash' },
		{ value: '\\${y}', quote: '`' as const, expected: '\\\\\\${y}' },
	])('should escape $value for $quote quotes', ({ value, quote, expected }) => {
		const escaped = escapeForStringLiteral(value, quote);

		expect(escaped).toBe(expected);
		// The escaped value must evaluate back to the original value
		expect(new Function(`return ${quote}${escaped}${quote};`)()).toBe(value);
	});
});

describe('typescriptCompletionSource', () => {
	async function acceptCompletion(doc: string, label: string, type = 'property') {
		const cursorPosition = doc.indexOf('|');
		const worker = mock<Comlink.Remote<LanguageServiceWorker>>();
		worker.getCompletionsAtPos.mockResolvedValue({
			result: { from: cursorPosition, options: [{ label, type }] },
			isGlobal: false,
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: doc.replace('|', ''),
				selection: { anchor: cursorPosition },
				extensions: [
					n8nLang(),
					typescriptWorkerFacet.of({ worker }),
					WORKFLOW_DOCUMENT_FACET.of(createWorkflowDocumentId('workflow-id')),
				],
			}),
		});

		const result = await typescriptCompletionSource(
			new CompletionContext(view.state, cursorPosition, false),
		);
		const completion = result?.options.find((option: Completion) => option.label === label);
		expect(completion).toBeDefined();
		expect(typeof completion?.apply).toBe('function');

		if (typeof completion?.apply === 'function') {
			completion.apply(view, completion, result?.from ?? cursorPosition, cursorPosition);
		}

		const text = view.state.doc.toString();
		view.destroy();
		return text;
	}

	it.each([
		{ doc: 'json["|"]', label: 'say "hi"', expected: 'json["say \\"hi\\""]' },
		{ doc: 'json["|"]', label: 'back\\slash', expected: 'json["back\\\\slash"]' },
		{ doc: 'json["|"]', label: 'content-type', expected: 'json["content-type"]' },
		{ doc: "json['|']", label: "it's", expected: "json['it\\'s']" },
		{ doc: "json['|']", label: 'say "hi"', expected: 'json[\'say "hi"\']' },
		{ doc: 'json["sa|"]', label: 'say "hi"', expected: 'json["say \\"hi\\""]' },
		{ doc: 'json[`a|`]', label: 'a`b', expected: 'json[`a\\`b`]' },
		{ doc: 'json[`x|`]', label: 'x${y}', expected: 'json[`x\\${y}`]' },
		{ doc: 'json[`b|`]', label: 'back\\slash', expected: 'json[`back\\\\slash`]' },
	])('should escape $label when inserted in $doc', async ({ doc, label, expected }) => {
		expect(await acceptCompletion(doc, label)).toBe(expected);
	});

	it('should insert a property after a dot without changes', async () => {
		expect(await acceptCompletion('json.|', 'myKey')).toBe('json.myKey');
	});

	it('should insert a method after a dot without changes', async () => {
		expect(await acceptCompletion('json.|', 'first()', 'method')).toBe('json.first()');
	});
});
