import { FOLDER_CANDIDATE_LIMIT, resolveRequestedFolder } from '../instance-ai-folder-scope';
import type { FolderInScope } from '../instance-ai-folder-scope';

const folder = (id: string, path: string, projectId = 'p1'): FolderInScope => ({
	id,
	name: path.split('/').at(-1) ?? path,
	path,
	projectId,
});

const scope: FolderInScope[] = [
	folder('clients', 'Clients'),
	folder('acme', 'Clients/Acme'),
	folder('acme-archive', 'Clients/acme-archive'),
	folder('archive-acme', 'Archive/Acme'),
	folder('logsearch', 'Personal Ops/logsearch'),
];

describe('resolveRequestedFolder', () => {
	it('resolves an exact path, case-insensitive, ignoring surrounding slashes', () => {
		expect(resolveRequestedFolder({ folderPath: '/clients/ACME/' }, scope)).toEqual({
			folderId: 'acme',
		});
	});

	it('lets an explicit but empty folderId win over folderPath, as not-found', () => {
		// Presence decides precedence, not truthiness: an invalid explicit id must not
		// quietly select whatever the path resolves to.
		expect(resolveRequestedFolder({ folderId: '', folderPath: 'Clients/Acme' }, scope)).toEqual({
			reason: 'not-found',
			candidates: expect.arrayContaining(['Clients/Acme']),
		});
	});

	it('resolves a bare nested folder name', () => {
		expect(resolveRequestedFolder({ folderPath: 'logsearch' }, scope)).toEqual({
			folderId: 'logsearch',
		});
	});

	it('resolves when a project-name prefix precedes the path', () => {
		// The user names the project first; a folder path never includes the project.
		expect(resolveRequestedFolder({ folderPath: 'Personal/Clients/acme-archive' }, scope)).toEqual({
			folderId: 'acme-archive',
		});
	});

	it('matches a suffix only on a segment boundary', () => {
		expect(resolveRequestedFolder({ folderPath: 'Ops/logsearch' }, scope)).toEqual({
			folderId: 'logsearch',
		});
		// "acme" must not match "acme-archive" by prefix; exact-name stage is ambiguous instead.
		expect(resolveRequestedFolder({ folderPath: 'acme' }, scope)).toEqual({
			reason: 'ambiguous',
			candidates: ['Archive/Acme', 'Clients/Acme'],
		});
	});

	it('reports not-found with sorted candidates capped at the limit', () => {
		const many = Array.from({ length: 30 }, (_, i) =>
			folder(`f${i}`, `Zone ${String(i).padStart(2, '0')}`),
		);

		const result = resolveRequestedFolder({ folderPath: 'nowhere' }, many);

		expect(result).toEqual(expect.objectContaining({ reason: 'not-found' }));
		if ('candidates' in result) {
			expect(result.candidates).toHaveLength(FOLDER_CANDIDATE_LIMIT);
			expect(result.candidates[0]).toBe('Zone 00');
		}
	});

	it('reports not-found for a folderId outside the scanned scope', () => {
		expect(resolveRequestedFolder({ folderId: 'elsewhere' }, scope)).toEqual({
			reason: 'not-found',
			candidates: [
				'Archive/Acme',
				'Clients',
				'Clients/Acme',
				'Clients/acme-archive',
				'Personal Ops/logsearch',
			],
		});
	});

	it('resolves a folderId that is in scope', () => {
		expect(resolveRequestedFolder({ folderId: 'clients' }, scope)).toEqual({ folderId: 'clients' });
	});

	it('reports unsupported when no folders could be read at all', () => {
		expect(resolveRequestedFolder({ folderPath: 'Clients' }, undefined)).toEqual({
			reason: 'unsupported',
			candidates: [],
		});
	});
});
