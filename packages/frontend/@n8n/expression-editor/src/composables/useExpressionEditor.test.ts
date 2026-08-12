import { EditorView } from '@codemirror/view';
import { render, waitFor } from '@testing-library/vue';
import { defineComponent, h, ref, toValue } from 'vue';

import { useExpressionEditor } from './useExpressionEditor';
import { n8nLang } from '../codemirror/n8nLang';
import type { ExpressionResolver } from '../types';

const stubResolver = (resolve: ExpressionResolver['resolve']): ExpressionResolver => ({ resolve });

async function renderEditor(options: Omit<Parameters<typeof useExpressionEditor>[0], 'editorRef'>) {
	let api!: ReturnType<typeof useExpressionEditor>;

	render(
		defineComponent({
			setup() {
				const root = ref<HTMLElement>();
				api = useExpressionEditor({ ...options, editorRef: root });
				return () => h('div', { ref: root, 'data-test-id': 'editor-root' });
			},
		}),
	);

	await waitFor(() => expect(toValue(api.editor)).toBeInstanceOf(EditorView));
	return api;
}

describe('useExpressionEditor', () => {
	it('resolves each resolvable through the injected resolver', async () => {
		const resolve = vi.fn().mockResolvedValue({ resolved: 42, error: false, fullError: null });

		const { segments } = await renderEditor({
			editorValue: 'before {{ $state.count }} after',
			extensions: [n8nLang()],
			resolver: stubResolver(resolve),
		});

		await waitFor(() => {
			expect(resolve).toHaveBeenCalledWith('{{ $state.count }}');
			expect(toValue(segments.all)).toEqual([
				{ from: 0, kind: 'plaintext', plaintext: 'before ', to: 7 },
				{
					error: null,
					from: 7,
					kind: 'resolvable',
					resolvable: '{{ $state.count }}',
					resolved: '42',
					state: 'valid',
					to: 25,
				},
				{ from: 25, kind: 'plaintext', plaintext: ' after', to: 31 },
			]);
		});
	});

	it('marks a resolvable invalid when the resolver reports an error', async () => {
		const failure = new Error('$state is not defined');

		const { segments } = await renderEditor({
			editorValue: '{{ $state.missing }}',
			extensions: [n8nLang()],
			resolver: stubResolver(() => ({
				resolved: '[$state is not defined]',
				error: true,
				fullError: failure,
			})),
		});

		await waitFor(() => {
			expect(toValue(segments.resolvable)).toEqual([
				expect.objectContaining({ state: 'invalid', resolved: '[$state is not defined]' }),
			]);
		});
	});

	it('shows [empty] for a single resolvable that resolves to an empty string', async () => {
		const { segments } = await renderEditor({
			editorValue: '{{ $state.title }}',
			extensions: [n8nLang()],
			resolver: stubResolver(() => ({ resolved: '', error: false, fullError: null })),
		});

		await waitFor(() => {
			expect(toValue(segments.all)).toEqual([
				expect.objectContaining({ kind: 'resolvable', resolved: '[empty]' }),
			]);
		});
	});

	it('shows [undefined] when the resolver yields undefined', async () => {
		const { segments } = await renderEditor({
			editorValue: '{{ $state.title }}',
			extensions: [n8nLang()],
			resolver: stubResolver(() => ({ resolved: undefined, error: false, fullError: null })),
		});

		await waitFor(() => {
			expect(toValue(segments.all)).toEqual([
				expect.objectContaining({ kind: 'resolvable', resolved: '[undefined]' }),
			]);
		});
	});
});
