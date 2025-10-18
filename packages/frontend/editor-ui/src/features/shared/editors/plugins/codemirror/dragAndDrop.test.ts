import { useNDVStore } from '@/stores/ndv.store';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/dom';
import { setActivePinia } from 'pinia';
import { mappingDropCursor } from './dragAndDrop';
import { n8nLang } from './n8nLang';

describe('CodeMirror drag and drop', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
	});

	describe('mappingDropCursor', () => {
		const createEditor = () => {
			const parent = document.createElement('div');
			document.body.appendChild(parent);
			const state = EditorState.create({
				doc: 'test {{ $json.foo }} \n\nnewline',
				extensions: [mappingDropCursor(), n8nLang()],
			});
			const editor = new EditorView({ parent, state });
			return editor;
		};

		it('should render a drop cursor when dragging', async () => {
			useNDVStore().draggableStartDragging({
				type: 'mapping',
				data: '{{ $json.bar }}',
				dimensions: null,
			});

			const editor = createEditor();
			const rect = editor.contentDOM.getBoundingClientRect();
			fireEvent(
				editor.contentDOM,
				new MouseEvent('mousemove', {
					clientX: rect.left,
					clientY: rect.top,
					bubbles: true,
				}),
			);

			const cursor = editor.dom.querySelector('.cm-dropCursor');

			expect(cursor).toBeInTheDocument();
		});

		it('should not render a drop cursor when not dragging', async () => {
			const editor = createEditor();
			const rect = editor.contentDOM.getBoundingClientRect();
			fireEvent(
				editor.contentDOM,
				new MouseEvent('mousemove', {
					clientX: rect.left,
					clientY: rect.top,
					bubbles: true,
				}),
			);

			const cursor = editor.dom.querySelector('.cm-dropCursor');

			expect(cursor).not.toBeInTheDocument();
		});
	});
});
