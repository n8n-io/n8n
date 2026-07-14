import type { XY } from './canvas-geometry';

const STORAGE_KEY_PREFIX = 'N8N_PROJECT_CANVAS_POSITIONS';
const STORAGE_VERSION = 2;

/** Child positions of a folder relative to its collapsed card, keyed by child id. */
export type FolderChildOffsets = Record<string, XY>;

export interface ProjectCanvasStoredState {
	positions: Map<string, XY>;
	/** Folder IDs that were expanded. */
	expanded: string[];
	/** Remembered child arrangements per folder, restored on expand. */
	childOffsets: Map<string, FolderChildOffsets>;
}

interface StoredPayload {
	version: number;
	positions: Record<string, XY>;
	expanded?: string[];
	childOffsets?: Record<string, FolderChildOffsets>;
}

export function positionsStorageKey(projectId: string): string {
	return `${STORAGE_KEY_PREFIX}/${projectId}`;
}

function isValidPoint(p: unknown): p is XY {
	if (typeof p !== 'object' || p === null) return false;
	const { x, y } = p as XY;
	return typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y);
}

/** Load the persisted canvas state for a project. Null when absent or unreadable. */
export function loadCanvasState(projectId: string): ProjectCanvasStoredState | null {
	try {
		const raw = localStorage.getItem(positionsStorageKey(projectId));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredPayload;
		// version 1 stored positions only — still usable, expansion state just starts collapsed
		if (
			typeof parsed?.version !== 'number' ||
			parsed.version < 1 ||
			parsed.version > STORAGE_VERSION ||
			typeof parsed.positions !== 'object' ||
			parsed.positions === null
		) {
			return null;
		}

		const positions = new Map<string, XY>();
		for (const [id, p] of Object.entries(parsed.positions)) {
			if (isValidPoint(p)) positions.set(id, { x: p.x, y: p.y });
		}

		const expanded = Array.isArray(parsed.expanded)
			? parsed.expanded.filter((id): id is string => typeof id === 'string')
			: [];

		const childOffsets = new Map<string, FolderChildOffsets>();
		if (typeof parsed.childOffsets === 'object' && parsed.childOffsets !== null) {
			for (const [folderId, offsets] of Object.entries(parsed.childOffsets)) {
				if (typeof offsets !== 'object' || offsets === null) continue;
				const valid: FolderChildOffsets = {};
				for (const [childId, p] of Object.entries(offsets)) {
					if (isValidPoint(p)) valid[childId] = { x: p.x, y: p.y };
				}
				childOffsets.set(folderId, valid);
			}
		}

		return { positions, expanded, childOffsets };
	} catch {
		return null;
	}
}

/**
 * Persist canvas state for a project. When `knownIds` is given, only entries for those
 * ids are written, so state of deleted entities doesn't accumulate.
 */
export function saveCanvasState(
	projectId: string,
	state: {
		positions: ReadonlyMap<string, XY>;
		expanded: readonly string[];
		childOffsets: ReadonlyMap<string, FolderChildOffsets>;
	},
	knownIds?: ReadonlySet<string>,
): void {
	try {
		const positions: Record<string, XY> = {};
		for (const [id, p] of state.positions) {
			if (knownIds && !knownIds.has(id)) continue;
			positions[id] = { x: Math.round(p.x), y: Math.round(p.y) };
		}
		const childOffsets: Record<string, FolderChildOffsets> = {};
		for (const [folderId, offsets] of state.childOffsets) {
			if (knownIds && !knownIds.has(folderId)) continue;
			childOffsets[folderId] = Object.fromEntries(
				Object.entries(offsets).map(([childId, p]) => [
					childId,
					{ x: Math.round(p.x), y: Math.round(p.y) },
				]),
			);
		}
		const payload: StoredPayload = {
			version: STORAGE_VERSION,
			positions,
			expanded: state.expanded.filter((id) => !knownIds || knownIds.has(id)),
			childOffsets,
		};
		localStorage.setItem(positionsStorageKey(projectId), JSON.stringify(payload));
	} catch {
		// storage may be full or unavailable — persistence is best-effort
	}
}
