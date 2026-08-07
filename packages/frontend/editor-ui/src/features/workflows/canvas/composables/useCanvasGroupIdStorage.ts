import { jsonParse } from 'n8n-workflow';
import { isStringArrayRecord } from '@/app/utils/objectUtils';

/**
 * localStorage-backed map of `workflowId -> group ids`, shared by the canvas
 * group view preferences (expanded groups, pinned descriptions). Each preference
 * passes its own storage key. Reads and writes never throw — these are view
 * preferences, so a corrupt or unavailable store degrades to "no preference".
 */
export function useCanvasGroupIdStorage(storageKey: string) {
	function readAll(): Record<string, string[]> {
		try {
			const parsed = jsonParse<unknown>(localStorage.getItem(storageKey) ?? '', {
				fallbackValue: {},
			});
			return isStringArrayRecord(parsed) ? parsed : {};
		} catch {
			return {};
		}
	}

	function read(workflowId: string): string[] {
		return readAll()[workflowId] ?? [];
	}

	function write(workflowId: string, ids: string[]) {
		try {
			localStorage.setItem(storageKey, JSON.stringify({ ...readAll(), [workflowId]: ids }));
		} catch {
			// Failure is not critical — these are view preferences
		}
	}

	return { read, write };
}
