import { describe, it, expect } from 'vitest';

// eslint-disable-next-line import-x/extensions
import shellModalsContent from './defaults/modals.ts?raw';

/**
 * A modal key with nothing defining it resolves to a closed state rather than
 * throwing (`ui.store.ts`, `withFallback`) — deliberate, since Seam A, and the
 * reason a missing definition now fails *silently*: the modal simply never opens.
 *
 * So this holds the two halves together: every `<ModalRoot :name="SOME_KEY">` in
 * the tree must have a definition backing it, either the shell catalogue in
 * `defaults/modals.ts` or — for module-owned modals, which register a component
 * alongside their key and render through `DynamicModalLoader` — `modalRegistry`.
 * A hand-written root is by definition the shell's, so the catalogue is where its
 * key has to be.
 *
 * Both sides are read as source text and compared by *constant name*: the same
 * `WORKFLOW_SETTINGS_MODAL_KEY` identifier has to appear on both. That keeps the
 * check on the pairing it exists to protect, independent of how either side is
 * written.
 *
 * As modals move onto the registry both sides shrink together — the `<ModalRoot>`
 * block goes, and so does the catalogue entry. When the catalogue is empty this
 * file has nothing left to check and goes with it.
 *
 * Not asserted in reverse: a definition may be rendered by something other than a
 * `<ModalRoot>` (`WorkflowHistory.vue` drives its diff modal through `<Modal>`
 * directly), so an entry with no matching root is not necessarily dead.
 */

const MODAL_ROOT_NAME_ATTR_REGEX = /<ModalRoot\s[^>]*?:name\s*=\s*(['"])([A-Z_][A-Z_0-9]*)\1/g;
const CATALOGUE_ENTRY_REGEX = /^\t\[([A-Z_][A-Z_0-9]*)\]\s*:/gm;

const vueSources = import.meta.glob<string>('../../**/*.vue', {
	query: '?raw',
	import: 'default',
	eager: true,
});

/** Constant-named modal keys rendered by a hand-written `<ModalRoot>`, by file. */
function renderedModalKeys(): Map<string, string> {
	const keys = new Map<string, string>();

	for (const [path, content] of Object.entries(vueSources)) {
		for (const [, , key] of content.matchAll(MODAL_ROOT_NAME_ATTR_REGEX)) {
			keys.set(key, path);
		}
	}

	return keys;
}

describe('shell modal definitions', () => {
	const rendered = renderedModalKeys();
	const defined = new Set(
		[...shellModalsContent.matchAll(CATALOGUE_ENTRY_REGEX)].map(([, key]) => key),
	);

	it('reads both sides — the shapes it matches on still exist', () => {
		// Guards the glob and the two regexes: if the glob path breaks or either side
		// is rewritten so nothing matches, this fails loudly instead of the emptiness
		// quietly passing the check below.
		expect(Object.keys(vueSources).length, 'the .vue glob matched almost nothing').toBeGreaterThan(
			100,
		);
		expect(rendered.size, 'no <ModalRoot :name="SOME_KEY"> found in any .vue file').toBeGreaterThan(
			0,
		);
		expect(defined.size, 'no [SOME_KEY]: entries found in defaults/modals.ts').toBeGreaterThan(0);
	});

	it('defines every modal key a <ModalRoot> renders', () => {
		const missing = [...rendered]
			.filter(([key]) => !defined.has(key))
			.map(([key, path]) => `  • ${key} (${path})`);

		expect(
			missing,
			missing.length
				? `\n\n❌ Rendered by a <ModalRoot> with no entry in SHELL_MODAL_INITIAL_STATE:\n${missing.join(
						'\n',
					)}\n\nAdd the entry, or move the modal onto modalRegistry and delete its <ModalRoot>.\n`
				: undefined,
		).toEqual([]);
	});
});
