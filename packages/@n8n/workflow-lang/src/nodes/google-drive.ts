/**
 * Compiled library node: a hand port of `n8n-nodes-base.googleDrive`
 * version 3, operation `fileFolder.search`, with OAuth2.
 *
 * The resource locators `filter.folderId` and `filter.driveId` arrive as
 * locators or, from the converter, as their value. A folder or drive given
 * by URL then arrives as the URL, so the node takes the id out of it, as v1
 * does with `extractValue`.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

/** A resource locator as v1 stores it; the converter passes only its value. */
interface Locator {
	mode?: string;
	value?: string;
	cachedResultName?: string;
}

interface DriveFilter {
	driveId?: string | Locator;
	folderId?: string | Locator;
	whatToSearch?: string;
	fileTypes?: string[];
	includeTrashed?: boolean;
}

interface DriveParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	searchMethod?: string;
	queryString?: unknown;
	returnAll?: boolean;
	limit?: number;
	filter?: DriveFilter;
	options?: DriveOptions;
	name?: string;
	fileId?: string | Locator;
	driveId?: string | Locator;
	folderId?: string | Locator;
	sameFolder?: boolean;
}

interface DriveOptions {
	fields?: string[];
	folderColorRgb?: string;
	simplifyOutput?: boolean;
	copyRequiresWriterPermission?: boolean;
	description?: string;
	deletePermanently?: boolean;
}

const FOLDER = 'application/vnd.google-apps.folder';
const ROOT_FOLDER = 'root';
const MY_DRIVE = 'My Drive';

/** escapeBackslashQuotedValue of n8n: a value inside '…' in a Drive query. */
function quoted(value: unknown): string {
	// getNodeParameter gives the default '' for null; an expression without a value stays undefined.
	return asText(value === null ? '' : value)
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'");
}

/** String(value) of JavaScript for JSON values and undefined. */
function asText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (Array.isArray(value)) {
		return value.map((v) => (v === null || v === undefined ? '' : asText(v))).join(',');
	}
	return '[object Object]';
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

/**
 * The id of a locator: its value, or the id in a Drive URL, as the locator's
 * `extractValue` pattern
 * `https://drive.google.com(?:/.*\/|/)(?:folders|drive)/([0-9a-zA-Z\-_]+)`
 * finds it (the last `/folders/` or `/drive/`, as `.*` is greedy).
 */
function locatorId(locator: string | Locator): string {
	const value = typeof locator === 'string' ? locator : String(locator.value ?? '');
	const prefix = 'https://drive.google.com';
	if (!value.startsWith(prefix)) return value;
	const rest = value.slice(prefix.length);
	for (let at = rest.length - 1; at >= 0; at--) {
		const skip =
			rest.slice(at, at + 9) === '/folders/' ? 9 : rest.slice(at, at + 7) === '/drive/' ? 7 : 0;
		if (skip === 0) continue;
		const start = at + skip;
		let end = start;
		while (end < rest.length && ID_CHARS.includes(rest.charAt(end))) end++;
		if (end > start) return rest.slice(start, end);
	}
	return value;
}

export default defineNode<DriveParameters>({
	type: 'n8n-nodes-base.googleDrive',
	version: 3,
	supports: {
		resource: 'file',
		operation: { fileFolder: 'search', folder: 'create', file: 'upload' },
		operations: {
			'fileFolder.search': [
				'authentication="oAuth2"',
				'searchMethod',
				'queryString',
				'returnAll',
				'limit',
				'filter',
				'filter.driveId',
				'filter.folderId',
				'filter.whatToSearch',
				'filter.fileTypes',
				'filter.includeTrashed',
				'options',
				'options.fields',
			],
			'folder.create': [
				'authentication="oAuth2"',
				'name',
				'driveId',
				'folderId',
				'options',
				'options.folderColorRgb',
				'options.simplifyOutput',
			],
			'file.copy': [
				'authentication="oAuth2"',
				'fileId',
				'name',
				'sameFolder',
				'driveId',
				'folderId',
				'options',
				'options.copyRequiresWriterPermission',
				'options.description',
			],
			'file.move': ['authentication="oAuth2"', 'fileId', 'driveId', 'folderId'],
			'file.deleteFile': [
				'authentication="oAuth2"',
				'fileId',
				'options',
				'options.deletePermanently',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'file';
		// The default operation of each resource in version 3.
		const defaults: Record<string, string> = {
			fileFolder: 'search',
			folder: 'create',
			file: 'upload',
		};
		const operation = parameters.operation ?? defaults[resource] ?? '';
		// Version 3 file and folder operations that send JSON: folder.create, file.copy,
		// file.move, file.deleteFile (googleApiRequest of the v1 node).
		if (
			(resource === 'folder' && operation === 'create') ||
			(resource === 'file' && ['copy', 'move', 'deleteFile'].includes(operation))
		) {
			const api = 'https://www.googleapis.com/drive/v3/files';
			const headers = { 'Content-Type': 'application/json' };
			const allDrives = {
				includeItemsFromAllDrives: true,
				supportsAllDrives: true,
				spaces: 'appDataFolder, drive',
				corpora: 'allDrives',
			};
			const request = async (
				method: string,
				url: string,
				qs: Record<string, unknown>,
				body: unknown,
			) => {
				const response = await ctx.http<Item>({ method, url, headers, qs, body, credential });
				if (response.status >= 400) throw new Error(`Google Drive: HTTP status ${response.status}`);
				return response.body;
			};
			// setParentFolder of the v1 node: the folder, else the shared drive, else the root.
			const parent = (): string => {
				const folder =
					parameters.folderId === undefined ? ROOT_FOLDER : locatorId(parameters.folderId);
				const drive = parameters.driveId === undefined ? MY_DRIVE : locatorId(parameters.driveId);
				if (folder !== ROOT_FOLDER) return folder;
				if (drive && drive !== MY_DRIVE) return drive;
				return ROOT_FOLDER;
			};
			const fileId = parameters.fileId === undefined ? '' : locatorId(parameters.fileId);
			const options = parameters.options ?? {};
			const out: Item[] = [];
			for (const _item of items ?? [{}]) {
				if (resource === 'folder') {
					const body: Record<string, unknown> = {
						name: parameters.name || 'Untitled',
						mimeType: FOLDER,
						parents: [parent()],
					};
					if (options.folderColorRgb) body.folderColorRgb = options.folderColorRgb;
					const qs: Record<string, unknown> = { ...allDrives };
					if (options.simplifyOutput === false) qs.fields = '*';
					out.push(await request('POST', api, qs, body));
					continue;
				}
				if (operation === 'copy') {
					let name = parameters.name ?? '';
					if (!name) {
						const locator = parameters.fileId;
						let original =
							typeof locator === 'object' && typeof locator.cachedResultName === 'string'
								? locator.cachedResultName
								: '';
						if (!original) {
							const meta = await request(
								'GET',
								`${api}/${fileId}`,
								{ fields: 'name', supportsAllDrives: true },
								undefined,
							);
							original = typeof meta.name === 'string' ? meta.name : '';
						}
						name = original ? `Copy of ${original}` : '';
					}
					const parents: string[] = [];
					if (parameters.sameFolder === false) parents.push(parent());
					const body: Record<string, unknown> = {
						copyRequiresWriterPermission: options.copyRequiresWriterPermission || false,
						parents,
					};
					if (name) body.name = name;
					if (options.description) body.description = options.description;
					out.push(await request('POST', `${api}/${fileId}/copy`, { ...allDrives }, body));
					continue;
				}
				if (operation === 'move') {
					const current = await request(
						'GET',
						`${api}/${fileId}`,
						{ ...allDrives, fields: 'parents' },
						undefined,
					);
					const parents = Array.isArray(current.parents) ? current.parents : [];
					out.push(
						await request(
							'PATCH',
							`${api}/${fileId}`,
							{ ...allDrives, addParents: parent(), removeParents: parents.join(',') },
							undefined,
						),
					);
					continue;
				}
				// deleteFile: to the trash, or for good with `deletePermanently`.
				if (options.deletePermanently === true) {
					await request('DELETE', `${api}/${fileId}`, { supportsAllDrives: true }, undefined);
				} else {
					await request(
						'PATCH',
						`${api}/${fileId}`,
						{ supportsAllDrives: true },
						{ trashed: true },
					);
				}
				out.push({ id: fileId, success: true });
			}
			return out;
		}
		if (resource !== 'fileFolder' || operation !== 'search') {
			throw new Error(`Google Drive: ${resource}.${operation} is not in the compiled library`);
		}
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			// v1 pushes a query text as it is and later drops the empty parts.
			const query: unknown[] = [];
			const queryString = parameters.queryString;
			if ((parameters.searchMethod ?? 'name') === 'name') {
				query.push(`name contains '${quoted(queryString)}'`);
			} else {
				query.push(queryString);
			}
			const filter = parameters.filter ?? {};
			let driveId = '';
			let folderId = '';
			const types: string[] = [];
			if (Object.keys(filter).length > 0) {
				if (filter.folderId) folderId = locatorId(filter.folderId);
				if (folderId && folderId !== ROOT_FOLDER) query.push(`'${quoted(folderId)}' in parents`);
				if (filter.driveId) driveId = locatorId(filter.driveId);
				const what = filter.whatToSearch || 'all';
				if (what === 'folders') {
					query.push(`mimeType = '${FOLDER}'`);
				} else {
					if (what === 'files') query.push(`mimeType != '${FOLDER}'`);
					const fileTypes = filter.fileTypes ?? [];
					if (fileTypes.length > 0 && !fileTypes.includes('*')) {
						for (const t of fileTypes) types.push(`mimeType = '${quoted(t)}'`);
					}
				}
				if (!filter.includeTrashed) query.push('trashed = false');
			}
			if (types.length > 0) query.push(`(${types.join(' or ')})`);
			const fields = parameters.options?.fields;
			const queryFields = fields ? (fields.includes('*') ? '*' : fields.join(', ')) : 'id, name';
			const qs: Record<string, unknown> = {
				fields: `nextPageToken, files(${queryFields})`,
				q: query
					.filter((q) => Boolean(q))
					.map(asText)
					.join(' and '),
				includeItemsFromAllDrives: true,
				supportsAllDrives: true,
				spaces: 'appDataFolder, drive',
				corpora: 'allDrives',
			};
			// updateDriveScopes of v1.
			if (driveId) {
				if (driveId === MY_DRIVE) {
					qs.includeItemsFromAllDrives = false;
					qs.supportsAllDrives = false;
					qs.spaces = 'appDataFolder, drive';
					qs.corpora = 'user';
				} else {
					qs.driveId = driveId;
					qs.corpora = 'drive';
				}
			}
			if (!driveId && folderId === ROOT_FOLDER) {
				qs.corpora = 'user';
				qs.spaces = 'drive';
				qs.includeItemsFromAllDrives = false;
				qs.supportsAllDrives = false;
			}
			const headers = { 'Content-Type': 'application/json' };
			const url = 'https://www.googleapis.com/drive/v3/files';
			if (parameters.returnAll === true) {
				// googleApiRequestAllItems: pages of 100; the token stays set once seen.
				qs.maxResults = 100;
				qs.pageSize = 100;
				for (let page = 0; page < 10000; page++) {
					const response = await ctx.http<{ files?: Item[]; nextPageToken?: string }>({
						method: 'GET',
						url,
						headers,
						qs,
						body: undefined,
						credential,
					});
					if (response.status >= 400)
						throw new Error(`Google Drive: HTTP status ${response.status}`);
					for (const file of response.body.files ?? []) out.push(file);
					const token = response.body.nextPageToken;
					if (token) qs.pageToken = token;
					if (token === undefined || token === '') break;
				}
			} else {
				qs.pageSize = parameters.limit ?? 50;
				const response = await ctx.http<{ files?: Item[] }>({
					method: 'GET',
					url,
					headers,
					qs,
					body: undefined,
					credential,
				});
				if (response.status >= 400) throw new Error(`Google Drive: HTTP status ${response.status}`);
				for (const file of response.body.files ?? []) out.push(file);
			}
		}
		return out;
	},
});
