import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import type {
	CreatePreferencePayload,
	Preference,
	PreferenceListQuery,
	PreferenceListResponse,
	UpdatePreferencePayload,
} from './context.types';
import { canWriteInstanceScope, canWriteProjectScope } from './context.utils';

/**
 * In-memory stand-in for the preferences endpoints, so the UI can be built and reviewed
 * before the real ones exist. `context.api.ts` is the only caller: swapping each of its
 * bodies for a `makeRestApiRequest` retires this file.
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
	return [
		{
			id: generateNanoId(),
			text: 'Prefer sub-workflows over node groups when you split a build into parts.',
			scopeType: 'user',
			projectId: null,
			project: null,
			scopes: [],
			createdAt: timestamp,
			updatedAt: timestamp,
		},
		{
			id: generateNanoId(),
			text: 'Keep replies short. Lead with the change you made, then the reason.',
			scopeType: 'user',
			projectId: null,
			project: null,
			scopes: [],
			createdAt: timestamp,
			updatedAt: timestamp,
		},
	];
}

function store(): Preference[] {
	rows ??= seed();
	return rows;
}

function scopesFor(row: Preference): string[] {
	const writable =
		row.scopeType === 'user' ||
		(row.scopeType === 'project' && canWriteProjectScope(row.projectId)) ||
		(row.scopeType === 'instance' && canWriteInstanceScope());

	return writable
		? ['preference:read', 'preference:update', 'preference:delete']
		: ['preference:read'];
}

function projectRefFor(projectId: string | null | undefined) {
	if (!projectId) return null;
	const project = useProjectsStore().myProjects.find((candidate) => candidate.id === projectId);
	return project ? { id: project.id, name: project.name ?? project.id, icon: project.icon } : null;
}

function hydrate(row: Preference): Preference {
	return { ...row, project: projectRefFor(row.projectId), scopes: scopesFor(row) };
}

export function list({ skip = 0, take = 50 }: PreferenceListQuery = {}): PreferenceListResponse {
	const all = store();
	return { count: all.length, data: all.slice(skip, skip + take).map(hydrate) };
}

export function create(payload: CreatePreferencePayload): Preference {
	const timestamp = nowIso();
	const row: Preference = {
		id: generateNanoId(),
		text: payload.text,
		scopeType: payload.scopeType,
		projectId: payload.scopeType === 'project' ? (payload.projectId ?? null) : null,
		project: null,
		scopes: [],
		createdAt: timestamp,
		updatedAt: timestamp,
	};
	store().unshift(row);
	return hydrate(row);
}

export function update(id: string, payload: UpdatePreferencePayload): Preference {
	const row = store().find((candidate) => candidate.id === id);
	if (!row) throw new Error('Preference not found');

	if (payload.text !== undefined) row.text = payload.text;
	if (payload.scopeType !== undefined) row.scopeType = payload.scopeType;
	row.projectId = row.scopeType === 'project' ? (payload.projectId ?? row.projectId) : null;
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
