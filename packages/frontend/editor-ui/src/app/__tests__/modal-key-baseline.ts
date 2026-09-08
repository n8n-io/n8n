/**
 * The decrease-only baseline for the two modal-key surfaces of the shell (CAT-3688),
 * and the rules that govern it. `modal-key-ratchet.test.ts` is the gate that reads it.
 *
 * The baseline itself is `modal-key-baseline.json`, next to this file. Regenerate it
 * with:
 *
 *     pnpm --filter n8n-editor-ui modal-baseline --update
 *
 * Do not hand-edit the file. The command writes the two lists exactly as the gate
 * reads them, and it refuses to write an entry that the baseline does not already
 * hold. So an extraction PR records itself in one command, and a reacquired modal
 * key cannot enter the baseline.
 *
 * This mirrors the `.janitor-baseline.json` ratchet in `packages/testing/janitor`:
 * one committed JSON snapshot, one command to regenerate it, and a check that fails
 * on a regression. It differs in one way, on purpose. The janitor baseline is
 * additive, because a violation can be absent from a report that never ran its rule.
 * Both modal lists are read whole from the modules on every run, so an absent entry
 * here always means the entry is gone, and the baseline can shrink to match.
 */

export const MODAL_BASELINE_VERSION = 1;

/** `scripts/modal-key-baseline.mjs --update` sets this for the ratchet run. */
export const MODAL_BASELINE_UPDATE_ENV = 'UPDATE_MODAL_BASELINE';

export const MODAL_BASELINE_UPDATE_COMMAND = 'pnpm --filter n8n-editor-ui modal-baseline --update';

/**
 * Relative to the package root, which is `process.cwd()` under vitest — jsdom gives
 * no `file:` URL, so `import.meta.url` cannot be resolved to a path here. Same
 * convention as `@n8n/composables/src/__tests__/packageBoundary.test.ts`.
 */
export const MODAL_BASELINE_PATH = 'src/app/__tests__/modal-key-baseline.json';

/**
 * Written into the baseline file on every regeneration, so the command is next to
 * the data. JSON has no comments, and `"//"` is the convention for this.
 */
export const MODAL_BASELINE_NOTICE = `Generated file — do not hand-edit. Run \`${MODAL_BASELINE_UPDATE_COMMAND}\` after a modal moves to its feature. The command removes entries only; it refuses to add one. For the rules, see src/app/__tests__/modal-key-baseline.ts.`;

/** The two surfaces, as the gate reads them from the modules. */
export interface ModalKeySurfaces {
	/** Names that `@/app/constants/modals` exports, without the result sentinels. */
	keyExports: string[];
	/** Keys that `SHELL_MODAL_INITIAL_STATE` defines. */
	catalogueKeys: string[];
}

export interface ModalKeyBaseline extends ModalKeySurfaces {
	'//': string;
	version: number;
}

export type ModalKeySurface = keyof ModalKeySurfaces;

export interface SurfaceDrift {
	/** In the shell, absent from the baseline: the shell reacquired an entry. */
	added: string[];
	/** In the baseline, gone from the shell: an extraction to record. */
	removed: string[];
}

const driftOf = (baseline: string[], shell: string[]): SurfaceDrift => {
	const inBaseline = new Set(baseline);
	const inShell = new Set(shell);
	return {
		added: shell.filter((entry) => !inBaseline.has(entry)).sort(),
		removed: baseline.filter((entry) => !inShell.has(entry)).sort(),
	};
};

export function baselineDrift(
	baseline: ModalKeySurfaces,
	shell: ModalKeySurfaces,
): Record<ModalKeySurface, SurfaceDrift> {
	return {
		keyExports: driftOf(baseline.keyExports, shell.keyExports),
		catalogueKeys: driftOf(baseline.catalogueKeys, shell.catalogueKeys),
	};
}

export class ModalKeyReacquisitionError extends Error {
	constructor(readonly drift: Record<ModalKeySurface, SurfaceDrift>) {
		super(
			[
				'The shell reacquired a modal key, so the baseline cannot be regenerated.',
				drift.keyExports.added.length > 0 &&
					`New key constants in @/app/constants/modals: ${drift.keyExports.added.join(', ')}. Declare each key in the constants file of the feature that owns it.`,
				drift.catalogueKeys.added.length > 0 &&
					`New entries in SHELL_MODAL_INITIAL_STATE: ${drift.catalogueKeys.added.join(', ')}. Write a ModalDefinition in the modals.ts fragment of the feature instead, so modalRegistry registers the modal.`,
				'The baseline can only become smaller. Fix the code; do not raise the baseline.',
			]
				.filter(Boolean)
				.join('\n'),
		);
		this.name = 'ModalKeyReacquisitionError';
	}
}

/**
 * The baseline that records `shell`, or a throw when `shell` holds an entry the
 * baseline does not. The throw is the decrease-only rule: it is what stops
 * `--update` from laundering a reacquisition into the committed baseline.
 */
export function nextBaseline(
	baseline: ModalKeySurfaces,
	shell: ModalKeySurfaces,
): ModalKeyBaseline {
	const drift = baselineDrift(baseline, shell);
	if (drift.keyExports.added.length > 0 || drift.catalogueKeys.added.length > 0) {
		throw new ModalKeyReacquisitionError(drift);
	}

	return {
		'//': MODAL_BASELINE_NOTICE,
		version: MODAL_BASELINE_VERSION,
		keyExports: [...shell.keyExports].sort(),
		catalogueKeys: [...shell.catalogueKeys].sort(),
	};
}

/** Tab-indented, one entry per line, trailing newline — what biome formats JSON to. */
export function serializeBaseline(baseline: ModalKeyBaseline): string {
	return `${JSON.stringify(baseline, null, '\t')}\n`;
}
