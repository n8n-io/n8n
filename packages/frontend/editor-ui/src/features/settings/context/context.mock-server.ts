import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUsersStore } from '@n8n/stores/users.store';

import type {
	Preference,
	PreferenceListQuery,
	PreferenceListResponse,
	PreferencePayload,
} from './context.types';
import { canWriteInstanceScope, canWriteProjectScope, preferenceScope } from './context.utils';

/**
 * In-memory stand-in for the preferences endpoints, so the UI can be built and reviewed
 * before the real ones exist. `context.api.ts` is the only caller: swapping each of its
 * bodies for a `makeRestApiRequest` retires this file.
 *
 * Rows carry the shape of an `ai_preference` row, and the list comes back oldest first,
 * matching `AiPreferenceRepository.findApplicable`.
 *
 * The scope derivation mirrors what the server is expected to do, reusing the same write
 * checks as the scope picker so the two cannot disagree. The server will send real
 * `preference:*` scopes.
 */

let rows: Preference[] | null = null;

function nowIso() {
	return new Date().toISOString();
}

/** Seeded only in development, so a flag flipped on in production never shows invented rows. */
function seed(): Preference[] {
	if (!import.meta.env.DEV) return [];

	const timestamp = nowIso();
	const userId = useUsersStore().currentUser?.id ?? null;
	return [
		'Prefer sub-workflows over node groups when you split a build into parts.',
		'Keep replies short. Lead with the change you made, then the reason.',
	].map((content) => ({
		id: generateNanoId(),
		content,
		userId,
		projectId: null,
		project: null,
		scopes: [],
		createdAt: timestamp,
		updatedAt: timestamp,
	}));
}

function store(): Preference[] {
	rows ??= seed();
	return rows;
}

function scopesFor(row: Preference): string[] {
	const scope = preferenceScope(row);
	const writable =
		scope === 'user' ||
		(scope === 'project' && canWriteProjectScope(row.projectId)) ||
		(scope === 'instance' && canWriteInstanceScope());

	return writable
		? ['preference:read', 'preference:update', 'preference:delete']
		: ['preference:read'];
}

function projectRefFor(projectId: string | null) {
	if (!projectId) return null;
	const project = useProjectsStore().myProjects.find((candidate) => candidate.id === projectId);
	return project ? { id: project.id, name: project.name ?? project.id, icon: project.icon } : null;
}

function hydrate(row: Preference): Preference {
	return { ...row, project: projectRefFor(row.projectId), scopes: scopesFor(row) };
}

/** The server owns `userId`, so a personal row is attributed to the acting user. */
function columnsFor(payload: PreferencePayload) {
	if (payload.scope === 'project') {
		return { userId: null, projectId: payload.projectId ?? null };
	}
	if (payload.scope === 'user') {
		return { userId: useUsersStore().currentUser?.id ?? null, projectId: null };
	}
	return { userId: null, projectId: null };
}

export function list({ skip = 0, take = 50 }: PreferenceListQuery = {}): PreferenceListResponse {
	const all = store();
	return { count: all.length, data: all.slice(skip, skip + take).map(hydrate) };
}

export function create(payload: PreferencePayload): Preference {
	const timestamp = nowIso();
	const row: Preference = {
		id: generateNanoId(),
		content: payload.content,
		...columnsFor(payload),
		project: null,
		scopes: [],
		createdAt: timestamp,
		updatedAt: timestamp,
	};
	// Appended, not prepended: the list is oldest first.
	store().push(row);
	return hydrate(row);
}

export function update(id: string, payload: PreferencePayload): Preference {
	const row = store().find((candidate) => candidate.id === id);
	if (!row) throw new Error('Preference not found');

	row.content = payload.content;
	Object.assign(row, columnsFor(payload));
	row.updatedAt = nowIso();

	return hydrate(row);
}

export function remove(id: string): void {
	const all = store();
	const index = all.findIndex((candidate) => candidate.id === id);
	if (index !== -1) all.splice(index, 1);
}

/** Test hook: drops all rows so each case starts from a known list. */
export function reset(next: Preference[] = []): void {
	rows = next;
}
