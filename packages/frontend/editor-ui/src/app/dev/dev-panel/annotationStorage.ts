import type { ElementContext } from './collectElementContext';
import type { Annotation } from './formatPrompt';

const STORAGE_KEY = 'n8n.devPanel.annotations';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredEntry = { updatedAt: number; annotations: Annotation[] };
type StoredShape = Record<string, StoredEntry>;

function read(): StoredShape {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? (parsed as StoredShape) : {};
	} catch {
		return {};
	}
}

function write(data: StoredShape) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// storage quota exceeded or disabled — nothing we can do
	}
}

function prune(data: StoredShape, now: number): { data: StoredShape; changed: boolean } {
	const pruned: StoredShape = {};
	let changed = false;
	for (const [key, entry] of Object.entries(data)) {
		if (!entry || typeof entry.updatedAt !== 'number' || now - entry.updatedAt > TTL_MS) {
			changed = true;
			continue;
		}
		pruned[key] = entry;
	}
	return { data: pruned, changed };
}

export function loadAnnotations(path: string): Annotation[] {
	const { data, changed } = prune(read(), Date.now());
	if (changed) write(data);
	return data[path]?.annotations ?? [];
}

export function saveAnnotations(path: string, annotations: Annotation[]) {
	const { data } = prune(read(), Date.now());
	if (annotations.length === 0) {
		delete data[path];
	} else {
		data[path] = { updatedAt: Date.now(), annotations };
	}
	write(data);
}

function escapeAttributeValue(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function resolveElementForContext(context: ElementContext): Element | null {
	if (context.selector) {
		try {
			const el = document.querySelector(context.selector);
			if (el) return el;
		} catch {
			// invalid selector — fall through to testid
		}
	}
	if (context.testid) {
		try {
			const el = document.querySelector(`[data-testid="${escapeAttributeValue(context.testid)}"]`);
			if (el) return el;
		} catch {
			// invalid selector — give up
		}
	}
	return null;
}
