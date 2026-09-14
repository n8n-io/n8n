import { createTestingPinia } from '@pinia/testing';

import AppCodeEditor from '@/features/apps/components/AppCodeEditor.vue';
import { renderComponent } from '@/__tests__/render';

// The TypeScript worker needs a real Worker/IndexedDB environment; the editor
// wrapper's own behaviour (mounting, forwarding the initial value, read-only)
// doesn't depend on what the worker returns, so it's mocked out here.
const createWorker = vi.fn().mockResolvedValue([]);
vi.mock('@/features/shared/editors/plugins/codemirror/typescript/client/useAppTypescript', () => ({
	useAppTypescript: () => ({ createWorker }),
}));

describe('AppCodeEditor', () => {
	beforeEach(() => {
		createWorker.mockClear();
	});

	it('renders the initial source', () => {
		const modelValue = 'export function render() { return "<p></p>"; }';
		const { container } = renderComponent(AppCodeEditor, {
			global: { plugins: [createTestingPinia()] },
			props: { modelValue },
		});

		expect(container.querySelector('.cm-content')?.textContent).toEqual(modelValue);
	});

	it('renders a JSX source', () => {
		const modelValue =
			'export function render(ctx: PageContext) { return <div>{ctx.page.title}</div>; }';
		const { container } = renderComponent(AppCodeEditor, {
			global: { plugins: [createTestingPinia()] },
			props: { modelValue },
		});

		expect(container.querySelector('.cm-content')?.textContent).toEqual(modelValue);
	});

	it('asks the TypeScript worker to type-check when editable', () => {
		renderComponent(AppCodeEditor, {
			global: { plugins: [createTestingPinia()] },
			props: { modelValue: '', isReadOnly: false },
		});

		expect(createWorker).toHaveBeenCalledTimes(1);
	});

	it('skips the TypeScript worker when read-only', () => {
		renderComponent(AppCodeEditor, {
			global: { plugins: [createTestingPinia()] },
			props: { modelValue: 'const x = 1;', isReadOnly: true },
		});

		expect(createWorker).not.toHaveBeenCalled();
	});
});
