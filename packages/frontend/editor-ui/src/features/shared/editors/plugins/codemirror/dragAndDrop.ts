import { useNDVStore } from '@/stores/ndv.store';
import { unwrapExpression } from '@/utils/expressions';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, StateEffect, StateField, type Extension } from '@codemirror/state';
import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view';

const setDropCursorPos = StateEffect.define<number | null>({
	map(pos, mapping) {
		return pos === null ? null : mapping.mapPos(pos);
	},
});

const dropCursorPos = StateField.define<number | null>({
	create() {
		return null;
	},
	update(pos, tr) {
		if (pos !== null) pos = tr.changes.mapPos(pos);
		return tr.effects.reduce((p, e) => (e.is(setDropCursorPos) ? e.value : p), pos);
	},
});

interface MeasureRequest<T> {
	read(view: EditorView): T;
	write?(measure: T, view: EditorView): void;
	key?: unknown;
}

// This is a modification of the CodeMirror dropCursor
// This version hooks into the state of the NDV drag-n-drop
//
// We can't use CodeMirror's dropCursor because it depends on HTML drag events while our drag-and-drop uses mouse events
// We could switch to drag events later but some features of the current drag-n-drop might not be possible with drag events
const drawDropCursor = ViewPlugin.fromClass(
	class {
		cursor: HTMLElement | null = null;

		measureReq: MeasureRequest<{ left: number; top: number; height: number } | null>;

		ndvStore: ReturnType<typeof useNDVStore>;

		constructor(readonly view: EditorView) {
			this.measureReq = { read: this.readPos.bind(this), write: this.drawCursor.bind(this) };
			this.ndvStore = useNDVStore();
		}

		update(update: ViewUpdate) {
			const cursorPos = update.state.field(dropCursorPos);
			if (cursorPos === null) {
				if (this.cursor !== null) {
					this.cursor?.remove();
					this.cursor = null;
				}
			} else {
				if (!this.cursor) {
					this.cursor = this.view.scrollDOM.appendChild(document.createElement('div'));
					this.cursor.className = 'cm-dropCursor';
				}
				if (
					update.startState.field(dropCursorPos) !== cursorPos ||
					update.docChanged ||
					update.geometryChanged
				)
					this.view.requestMeasure(this.measureReq);
			}
		}

		readPos(): { left: number; top: number; height: number } | null {
			const { view } = this;
			const pos = view.state.field(dropCursorPos);
			const rect = pos !== null && view.coordsAtPos(pos);
			if (!rect) return null;
			const outer = view.scrollDOM.getBoundingClientRect();
			return {
				left: rect.left - outer.left + view.scrollDOM.scrollLeft * view.scaleX,
				top: rect.top - outer.top + view.scrollDOM.scrollTop * view.scaleY,
				height: rect.bottom - rect.top,
			};
		}

		drawCursor(pos: { left: number; top: number; height: number } | null) {
			if (this.cursor) {
				const { scaleX, scaleY } = this.view;
				if (pos) {
					this.cursor.style.left = pos.left / scaleX + 'px';
					this.cursor.style.top = pos.top / scaleY + 'px';
					this.cursor.style.height = pos.height / scaleY + 'px';
				} else {
					this.cursor.style.left = '-100000px';
				}
			}
		}

		destroy() {
			if (this.cursor) this.cursor.remove();
		}

		setDropPos(pos: number | null) {
			if (this.view.state.field(dropCursorPos) !== pos)
				this.view.dispatch({ effects: setDropCursorPos.of(pos) });
		}
	},
	{
		eventObservers: {
			mousemove(event) {
				if (!this.ndvStore.isDraggableDragging || this.ndvStore.draggableType !== 'mapping') return;
				const pos = this.view.posAtCoords(eventToCoord(event), false);
				this.setDropPos(pos);
			},
			mouseleave() {
				this.setDropPos(null);
			},
			mouseup() {
				this.setDropPos(null);
			},
		},
	},
);

function eventToCoord(event: MouseEvent): { x: number; y: number } {
	return { x: event.clientX, y: event.clientY };
}

function dropValueInEditor(view: EditorView, pos: number, value: string) {
	const changes = view.state.changes({ from: pos, insert: value });
	const anchor = changes.mapPos(pos, -1);
	const head = changes.mapPos(pos, 1);
	const selection = EditorSelection.single(anchor, head);

	view.dispatch({
		changes,
		selection,
		userEvent: 'input.drop',
	});

	setTimeout(() => view.focus());
	return selection;
}

export async function dropInExpressionEditor(view: EditorView, event: MouseEvent, value: string) {
	const dropPos = view.posAtCoords(eventToCoord(event), false);
	const node = syntaxTree(view.state).resolve(dropPos);
	let valueToInsert = value;

	// We are already in an expression, do not insert brackets
	if (node.name === 'Resolvable') {
		valueToInsert = unwrapExpression(value);
	}

	return dropValueInEditor(view, dropPos, valueToInsert);
}

export async function dropInCodeEditor(view: EditorView, event: MouseEvent, value: string) {
	const dropPos = view.posAtCoords(eventToCoord(event), false);
	const valueToInsert = unwrapExpression(value);

	return dropValueInEditor(view, dropPos, valueToInsert);
}

export function mappingDropCursor(): Extension {
	return [dropCursorPos, drawDropCursor];
}
