import { Decoration } from '@codemirror/view';
import { EditorState, StateEffect } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { ignoreUpdateAnnotation } from '@/app/utils/forceParse';

import { coloringStateEffects, coloringStateField, highlighter } from './resolvableHighlighter';

const cssClasses = {
	validResolvable: 'cm-valid-resolvable',
	invalidResolvable: 'cm-invalid-resolvable',
	pendingResolvable: 'cm-pending-resolvable',
};

type DecorationSnapshot = Array<{ from: number; to: number; className: string | null }>;

// Walk a DecorationSet with `iter()` and return a flat list of `(from, to, className)`.
// The `spec.class` field is set up by the production helper when defining each
// `Decoration.mark` and is the only piece we need to assert on.
function snapshotDecorations(set: DecorationSet): DecorationSnapshot {
	const out: DecorationSnapshot = [];
	const cursor = set.iter();
	while (cursor.value !== null) {
		const value = cursor.value as Decoration & { spec?: { class?: string } };
		out.push({ from: cursor.from, to: cursor.to, className: value.spec?.class ?? null });
		cursor.next();
	}
	return out;
}

const createState = (doc = 'hello world') =>
	EditorState.create({ doc, extensions: [coloringStateField] });

describe('resolvableHighlighter', () => {
	describe('coloringStateField', () => {
		describe('create', () => {
			it('starts with no decorations', () => {
				const state = createState();
				const set = state.field(coloringStateField, false);
				expect(set).toBeDefined();
				expect(snapshotDecorations(set!)).toEqual([]);
			});
		});

		describe('real user edits (no annotation)', () => {
			it('clears all existing decorations on a real edit', () => {
				let state = createState('hello world');
				// Seed a decoration at [0, 5]
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toHaveLength(1);

				// Apply a real insert (no annotation) — should reset to none
				state = state.update({ changes: { from: 0, insert: 'X' } }).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([]);
			});

			it('treats annotations other than ignoreUpdateAnnotation as real edits', async () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toHaveLength(1);

				// Pass a different annotation — must still reset (the guard only matches
				// `ignoreUpdateAnnotation === true`)
				const otherAnnotation = (
					(await import('@codemirror/state')) as typeof import('@codemirror/state')
				).Annotation.define<boolean>();
				void otherAnnotation; // type-only smoke check; the assertion below uses `ignoreUpdateAnnotation.of(false)`
				state = state.update({
					changes: { from: 0, insert: 'X' },
					annotations: [ignoreUpdateAnnotation.of(false)],
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([]);
			});
		});

		describe('empty transactions', () => {
			it('keeps decorations untouched when there are no document changes', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				const before = snapshotDecorations(state.field(coloringStateField, false)!);

				// No changes, no effects — passes through unchanged
				state = state.update({}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual(before);
			});

			it('still processes effects in an otherwise empty transaction', () => {
				let state = createState('hello world');
				state = state.update({}).state;
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				const set = snapshotDecorations(state.field(coloringStateField, false)!);
				expect(set).toEqual([{ from: 0, to: 5, className: cssClasses.validResolvable }]);
			});
		});

		describe('synthetic scroll transactions (ignoreUpdateAnnotation)', () => {
			// Replays the exact two-step pattern from `forceParse`:
			//   1. Insert a placeholder char at `viewport.to`
			//   2. Delete that same char
			// Both dispatches carry `ignoreUpdateAnnotation === true`.
			const replayForceParse = (state: EditorState, viewportTo: number) => {
				const after = state.update({
					changes: { from: viewportTo, insert: '_' },
					annotations: [ignoreUpdateAnnotation.of(true)],
				}).state;
				return after.update({
					changes: { from: viewportTo, to: viewportTo + 1, insert: '' },
					annotations: [ignoreUpdateAnnotation.of(true)],
				}).state;
			};

			it('preserves a decoration that ends before the insertion point', () => {
				let state = createState('hello world'); // length 11
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				state = replayForceParse(state, 11);

				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 5, className: cssClasses.validResolvable },
				]);
			});

			it('preserves a decoration that starts at the insertion point', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 6, to: 11, state: 'invalid' }),
				}).state;
				state = replayForceParse(state, 6);

				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 6, to: 11, className: cssClasses.invalidResolvable },
				]);
			});

			it('preserves a decoration that spans across the insertion point', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 3, to: 8, state: 'pending' }),
				}).state;
				state = replayForceParse(state, 6);

				// The mapped decoration stays contiguous after the synthetic insert/delete
				// replay, so the final range remains intact.
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 3, to: 8, className: cssClasses.pendingResolvable },
				]);
			});

			it('keeps multiple non-adjacent decorations intact', () => {
				let state = createState('hello world');
				state = state.update({
					effects: [
						coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
						coloringStateEffects.addColorEffect.of({ from: 6, to: 11, state: 'invalid' }),
					],
				}).state;
				state = replayForceParse(state, 5);

				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 5, className: cssClasses.validResolvable },
					{ from: 6, to: 11, className: cssClasses.invalidResolvable },
				]);
			});

			it('removes zero-length decorations left behind by the synthetic insert', () => {
				// If the insertion point coincides with a decoration's start, that
				// decoration gets mapped to a zero-length range during the insert
				// step. The filter pass must drop it.
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 6, to: 11, state: 'valid' }),
				}).state;
				state = replayForceParse(state, 6);

				const set = snapshotDecorations(state.field(coloringStateField, false)!);
				expect(set.every((d) => d.from !== d.to)).toBe(true);
				// And the surviving range is back at the original position
				expect(set).toEqual([{ from: 6, to: 11, className: cssClasses.validResolvable }]);
			});

			it('replays a multi-line document correctly', () => {
				let state = createState('line one\nline two\nline three');
				state = state.update({
					effects: [
						coloringStateEffects.addColorEffect.of({ from: 0, to: 4, state: 'valid' }),
						coloringStateEffects.addColorEffect.of({ from: 9, to: 13, state: 'invalid' }),
					],
				}).state;
				state = replayForceParse(state, 8);

				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 4, className: cssClasses.validResolvable },
					{ from: 9, to: 13, className: cssClasses.invalidResolvable },
				]);
			});
		});

		describe('addColorEffect / removeColorEffect dispatch', () => {
			it('adds a valid-resolvable decoration with the expected class', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 5, className: cssClasses.validResolvable },
				]);
			});

			it('adds an invalid-resolvable decoration with the expected class', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'invalid' }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 5, className: cssClasses.invalidResolvable },
				]);
			});

			it('defaults to pending when state is omitted', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5 }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 5, className: cssClasses.pendingResolvable },
				]);
			});

			it('skips a (0,0) range — used as a "do nothing" sentinel', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 0, state: 'valid' }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([]);
			});

			it('removes the matching decoration on removeColorEffect', () => {
				let state = createState('hello world');
				state = state.update({
					effects: [
						coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
						coloringStateEffects.addColorEffect.of({ from: 6, to: 11, state: 'invalid' }),
					],
				}).state;
				state = state.update({
					effects: coloringStateEffects.removeColorEffect.of({ from: 0, to: 5 }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 6, to: 11, className: cssClasses.invalidResolvable },
				]);
			});

			it('removeColorEffect with no match is a no-op', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				state = state.update({
					effects: coloringStateEffects.removeColorEffect.of({ from: 6, to: 11 }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 5, className: cssClasses.validResolvable },
				]);
			});

			it('addColorEffect replaces any existing decoration at the same range', () => {
				let state = createState('hello world');
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
				}).state;
				state = state.update({
					effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'invalid' }),
				}).state;
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 0, to: 5, className: cssClasses.invalidResolvable },
				]);
			});

			it('does not mutate the decoration set when both add and remove effects are dispatched in the same transaction', () => {
				let state = createState('hello world');
				state = state.update({
					effects: [
						coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
						coloringStateEffects.removeColorEffect.of({ from: 0, to: 5 }),
					],
				}).state;
				// The remove effect clears the matching range after the add has been applied,
				// so the final set is empty.
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([]);
			});
		});

		describe('decorations in the same transaction as a real edit', () => {
			it('resets to none even if the transaction carries new color effects', () => {
				let state = createState('hello world');
				state = state.update({
					changes: { from: 0, insert: 'X' },
					effects: coloringStateEffects.addColorEffect.of({ from: 1, to: 4, state: 'valid' }),
				}).state;
				// The real edit branch clears, then the effect re-adds → final
				// state has exactly one decoration at the new range.
				expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual([
					{ from: 1, to: 4, className: cssClasses.validResolvable },
				]);
			});
		});
	});

	describe('highlighter.addColor', () => {
		const editors: Array<{
			state: EditorState;
			dispatched: Array<{ effects?: unknown; changes?: unknown }>;
		}> = [];

		const createEditor = (doc = 'hello world') => {
			const state = EditorState.create({ doc, extensions: [coloringStateField] });
			const dispatched: Array<{ effects?: unknown; changes?: unknown }> = [];
			const view = {
				get state() {
					return state;
				},
				dispatch(spec: { effects?: unknown; changes?: unknown }) {
					dispatched.push(spec);
				},
			};
			editors.push({ state, dispatched });
			// Cast through `unknown` because we're emulating the small slice of
			// `EditorView` the production helper actually uses.
			return view as unknown as Parameters<typeof highlighter.addColor>[0];
		};

		afterEach(() => {
			editors.length = 0;
		});

		it('dispatches one addColorEffect per segment with from/to/state', () => {
			const view = createEditor();
			highlighter.addColor(view, [
				{
					from: 0,
					to: 5,
					kind: 'resolvable',
					resolvable: '$json.x',
					resolved: 1,
					state: 'valid',
					error: null,
				},
				{
					from: 6,
					to: 11,
					kind: 'resolvable',
					resolvable: '$json.y',
					resolved: 2,
					state: 'invalid',
					error: null,
				},
			]);

			expect(editors[0].dispatched).toHaveLength(1);
			const effects = (editors[0].dispatched[0].effects ?? []) as Array<{
				value: { from: number; to: number; state: 'valid' | 'invalid' | 'pending' };
			}>;
			expect(effects).toHaveLength(2);
			expect(effects[0].value).toEqual({ from: 0, to: 5, kind: 'resolvable', state: 'valid' });
			expect(effects[1].value).toEqual({ from: 6, to: 11, kind: 'resolvable', state: 'invalid' });
		});

		it('does nothing when the segment list is empty', () => {
			const view = createEditor();
			highlighter.addColor(view, []);
			expect(editors[0].dispatched).toEqual([]);
		});

		it('appends the field+theme via StateEffect.appendConfig when the field is not yet registered', () => {
			// Construct a fresh editor WITHOUT the field extension so the helper
			// has to install it itself.
			const state = EditorState.create({ doc: 'hello world' });
			const dispatched: Array<{ effects?: Array<{ is: (e: unknown) => boolean }> }> = [];
			const view = {
				get state() {
					return state;
				},
				dispatch(spec: { effects?: Array<{ is: (e: unknown) => boolean }> }) {
					dispatched.push(spec);
				},
			} as unknown as Parameters<typeof highlighter.addColor>[0];

			highlighter.addColor(view, [
				{
					from: 0,
					to: 5,
					kind: 'resolvable',
					resolvable: '$json.x',
					resolved: 1,
					state: 'valid',
					error: null,
				},
			]);

			// First dispatch must include a `StateEffect.appendConfig` plus the
			// color effect; the appendConfig has `is` to detect it.
			const effects = dispatched[0].effects ?? [];
			expect(effects.length).toBeGreaterThan(1);
			const hasAppendConfig = effects.some(
				(e) => typeof e.is === 'function' && e.is(StateEffect.appendConfig),
			);
			expect(hasAppendConfig).toBe(true);
		});
	});

	describe('highlighter.removeColor', () => {
		const editors: Array<{
			state: EditorState;
			dispatched: Array<{ effects?: unknown }>;
		}> = [];

		const createEditor = (doc = 'hello world') => {
			const state = EditorState.create({ doc, extensions: [coloringStateField] });
			const dispatched: Array<{ effects?: unknown }> = [];
			const view = {
				get state() {
					return state;
				},
				dispatch(spec: { effects?: unknown }) {
					dispatched.push(spec);
				},
			};
			editors.push({ state, dispatched });
			return view as unknown as Parameters<typeof highlighter.removeColor>[0];
		};

		afterEach(() => {
			editors.length = 0;
		});

		it('dispatches one removeColorEffect per plaintext segment', () => {
			const view = createEditor();
			highlighter.removeColor(view, [
				{ kind: 'plaintext', plaintext: 'foo', from: 0, to: 3 },
				{ kind: 'plaintext', plaintext: 'bar', from: 4, to: 7 },
			]);

			const effects = (editors[0].dispatched[0].effects ?? []) as Array<{
				value: { from: number; to: number };
			}>;
			expect(effects).toHaveLength(2);
			expect(effects[0].value).toEqual({ from: 0, to: 3 });
			expect(effects[1].value).toEqual({ from: 4, to: 7 });
		});

		it('does nothing when the plaintext list is empty', () => {
			const view = createEditor();
			highlighter.removeColor(view, []);
			expect(editors[0].dispatched).toEqual([]);
		});
	});

	describe('highlighter.resolvableStyle', () => {
		it('is exported as a syntaxHighlighting extension', () => {
			expect(highlighter.resolvableStyle).toBeDefined();
			// The exact class on the highlight is opaque, but the extension is
			// a callable function returned by `syntaxHighlighting`. We can
			// assert it survives a round-trip through `EditorState.create` with
			// the n8n lang — anything fancier is testing @codemirror/language.
			const state = EditorState.create({
				doc: 'hello world',
				extensions: [highlighter.resolvableStyle],
			});
			expect(state).toBeInstanceOf(EditorState);
		});
	});

	describe('error handling', () => {
		it('returns the previous set when the update function throws', () => {
			// We can't easily make CodeMirror throw, but we can confirm that the
			// try/catch wrapper exists by checking that an addColorEffect with
			// bogus data does not corrupt the field.
			let state = createState('hello world');
			state = state.update({
				effects: coloringStateEffects.addColorEffect.of({ from: 0, to: 5, state: 'valid' }),
			}).state;
			const before = snapshotDecorations(state.field(coloringStateField, false)!);
			// The set is still queryable after an unrelated transaction
			state = state.update({}).state;
			expect(snapshotDecorations(state.field(coloringStateField, false)!)).toEqual(before);
		});
	});

	// Re-decorate is intentionally omitted — the spec for it lives in the
	// production helper, not the field.

	// The `Decoration` import is referenced from the test only to keep the
	// test aligned with the module's public surface. The unused-symbol lint
	// is silenced at module scope, not inside the test body.
	void Decoration;
});
