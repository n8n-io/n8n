import { isRecord } from '@n8n/utils/is-record';
import type { HttpVendorProfile } from './http-profiles';

const MAX_PARENTS = 4;
const FOLDER_TYPE = 'application/vnd.google-apps.folder';

// `/drive/v3/files/<id>` and `/upload/drive/v3/files/<id>`. These names are actions of the collection.
const FILE_IN_PATH = /^\/(?:upload\/)?drive\/v3\/files\/([^/:?]+)/;
const FILE_ACTIONS: ReadonlySet<string> = new Set(['generateIds', 'emptyTrash', 'watch']);
const DRIVE_IN_PATH = /^\/drive\/v3\/drives\/([^/:?]+)/;
const PARENT_IN_QUERY = /'([^']+)'\s+in\s+parents/gi;
// The bytes of a file. The gym has no copy of them, so a read of the bytes seeds nothing.
const CONTENT_PATH = /^\/drive\/v3\/files\/[^/]+\/export$/;

const FILE_FIELDS =
	'id,name,mimeType,parents,createdTime,modifiedTime,trashed,starred,description,driveId';

const safeDecode = (text: string): string => {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
};

const idOf = (value: unknown): string | undefined =>
	isRecord(value) && typeof value.id === 'string' && value.id !== '' ? value.id : undefined;

function enrichFile(file: Record<string, unknown>): Record<string, unknown> {
	const id = idOf(file);
	if (id === undefined || (file.mimeType === undefined && file.name === undefined)) return file;
	const parent = Array.isArray(file.parents) ? file.parents[0] : undefined;
	return {
		...file,
		worldRef: `${file.mimeType === FOLDER_TYPE ? 'folder' : 'file'}:${id}`,
		...(typeof parent === 'string' && { parentRef: `folder:${parent}` }),
	};
}

/** Adds `worldRef` and `parentRef` to every file of an answer, also to the files of a list. */
export function enrichDrive(json: unknown): unknown {
	if (!isRecord(json)) return json;
	if (Array.isArray(json.files)) {
		return { ...json, files: json.files.map((f) => (isRecord(f) ? enrichFile(f) : f)) };
	}
	return enrichFile(json);
}

const fileRead = (id: string) => ({
	tool: 'read_get_drive_files',
	args: {
		method: 'GET',
		path: `/drive/v3/files/${encodeURIComponent(id)}`,
		query: { fields: FILE_FIELDS, supportsAllDrives: 'true' },
	},
});

const driveRead = (id: string) => ({
	tool: 'read_get_drive_drives',
	args: { method: 'GET', path: `/drive/v3/drives/${encodeURIComponent(id)}` },
});

const unique = (ids: string[]): string[] => [...new Set(ids)].slice(0, MAX_PARENTS);

const stringsOf = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const csv = (value: unknown): string[] =>
	(Array.isArray(value) ? value : [value]).flatMap((v) =>
		typeof v === 'string' ? v.split(',').map((s) => s.trim()) : [],
	);

// The folders that a write names as parents: in the body, or in `addParents` of a move.
function parentsOfWrite(args: Record<string, unknown>): string[] {
	const body = isRecord(args.body) ? args.body : undefined;
	const query = isRecord(args.query) ? args.query : undefined;
	return unique(
		[...stringsOf(body?.parents), ...csv(query?.addParents), ...csv(query?.removeParents)].filter(
			(id) => id !== '' && id !== 'root',
		),
	);
}

// The file that a path names. An id can be a short word, so this reads the place in the path.
function fileInPath(path: string): string | undefined {
	const id = FILE_IN_PATH.exec(path)?.[1];
	return id !== undefined && !FILE_ACTIONS.has(id) ? safeDecode(id) : undefined;
}

// A list shows folders only by id. The folder that a query names, and the parents of the files of the
// answer, are the folders that the gym needs.
function parentsOfRead(args: Record<string, unknown>, result: unknown): string[] {
	const query = isRecord(args.query) ? args.query : undefined;
	const search = [query?.q].flat().join(' ');
	const named = [...search.matchAll(PARENT_IN_QUERY)].map((m) => m[1]);
	const files = isRecord(result) && Array.isArray(result.files) ? result.files : [];
	const single = isRecord(result) && result.files === undefined ? [result] : [];
	const shown = new Set([...files, ...single].flatMap((f) => idOf(f) ?? []));
	const parents = [...files, ...single].flatMap((f) => (isRecord(f) ? stringsOf(f.parents) : []));
	return unique([...named, ...parents].filter((id) => id !== 'root' && !shown.has(id)));
}

const FORBIDDEN_KEYS = new Set([
	'owner',
	'shared_with',
	'content',
	'content_base64',
	'body',
	'shared_drive',
]);
const DRIVE_KEYS = ['google_drive', 'google-drive'];

// The gym placeholder account owns every file. The real people are no accounts of the gym tenant, and
// the gym has no bytes of the real files. Code removes owner, sharing, permissions and content.
export function withPlaceholderOwner(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	if (!native) return overlay;
	const strip = (items: unknown) =>
		Array.isArray(items)
			? items.map((item) =>
					isRecord(item)
						? Object.fromEntries(Object.entries(item).filter(([key]) => !FORBIDDEN_KEYS.has(key)))
						: item,
				)
			: items;
	const cleaned: Record<string, unknown> = { ...native };
	for (const key of DRIVE_KEYS) {
		const block = native[key];
		if (!isRecord(block)) continue;
		const { permissions: _permissions, ...rest } = block;
		cleaned[key] = {
			...rest,
			...(rest.files !== undefined && { files: strip(rest.files) }),
			...(rest.folders !== undefined && { folders: strip(rest.folders) }),
			...(rest.shared_drives !== undefined && { shared_drives: strip(rest.shared_drives) }),
		};
	}
	return { ...overlay, native: cleaned };
}

const PLACEHOLDER_ACCOUNT = 'guard@unknown.invalid';

export const GOOGLE_DRIVE_PROFILE: HttpVendorProfile = {
	name: 'googledrive',
	gymService: 'google-drive',
	opaqueIds: true,
	defaultAdminUrl: 'http://127.0.0.1:9096',
	defaultGymUrl: 'http://127.0.0.1:8086',
	credentialKind: 'google_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: 'person:me', name: 'Guard', email: PLACEHOLDER_ACCOUNT },
	},
	enrich: enrichDrive,
	finalize: withPlaceholderOwner,
	lookups: (tool, args, result) => {
		const path = String(args.path);
		const drive = DRIVE_IN_PATH.exec(path)?.[1];
		if (drive !== undefined) return [driveRead(safeDecode(drive))];
		const file = fileInPath(path);
		if (tool.startsWith('write_')) {
			// A write needs its file and the folders that it names.
			return [
				...(file === undefined ? [] : [fileRead(file)]),
				...parentsOfWrite(args).map(fileRead),
			];
		}
		// A read of a file shows its parents by id. The gym needs the folders too.
		return [
			...(file === undefined ? [] : [fileRead(file)]),
			...parentsOfRead(args, result).map(fileRead),
		];
	},
	hydrateRead: (args) => args.query?.alt !== 'media' && !CONTENT_PATH.test(args.path),
	hydrateWrite: (args, gymIds) => {
		// The body of an upload holds the bytes. They go to the gym only, never to the model.
		if (args.path.startsWith('/upload/')) return false;
		const file = fileInPath(args.path);
		const drive = DRIVE_IN_PATH.exec(args.path)?.[1];
		const ids = [
			...(file === undefined ? [] : [file]),
			...(drive === undefined ? [] : [safeDecode(drive)]),
			...parentsOfWrite(args),
		];
		return ids.some((id) => !gymIds.has(id));
	},
};
