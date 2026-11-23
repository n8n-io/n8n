import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { enrichDrive, GOOGLE_DRIVE_PROFILE, withPlaceholderOwner } from '../google-drive-profile';
import { HTTP_PROFILES } from '../http-profiles';
import { HttpGuardRouter } from '../http-router';
import { toToolCall } from '../http-tool-caller';
import type { McpCaller } from '../mcp-upstream';
import type { CapturedRequest } from '../network';
import { isReadShaped } from '../request-classifier';
import { isTokenExchange, loadVendorKnowledge, vendorForRequest } from '../vendor-knowledge';

const HOST = 'www.googleapis.com';
const FILE = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCd';
const FOLDER = '0BwwA4oUTeiV1UVNwOHItT0xfa2M';
const FILES = `/drive/v3/files/${FILE}`;
const FOLDER_TYPE = 'application/vnd.google-apps.folder';

const req = (method: string, path: string, body?: unknown, host = HOST) =>
	({
		method,
		url: new URL(`https://${host}${path}`),
		headers: { authorization: 'Bearer real-token-123' },
		body:
			body === undefined
				? undefined
				: Buffer.isBuffer(body)
					? body
					: Buffer.from(JSON.stringify(body)),
	}) satisfies CapturedRequest;

describe('the Google Drive vendor file', () => {
	const vendor = loadVendorKnowledge('googledrive');

	it('names www.googleapis.com and the two Drive prefixes, without read paths', () => {
		expect(vendor.name).toBe('googledrive');
		expect(vendor.hosts).toEqual(['www.googleapis.com']);
		expect(vendor.pathPrefixes).toEqual(['/drive/v3', '/upload/drive/v3']);
		expect(vendor.readPaths).toEqual([]);
		expect(vendor.instructions).toContain('native.google_drive');
	});

	it('is chosen for a Drive request only, next to Gmail on the same host', () => {
		expect(vendorForRequest(HOST, '/drive/v3/files')?.name).toBe('googledrive');
		expect(vendorForRequest(HOST, '/upload/drive/v3/files')?.name).toBe('googledrive');
		expect(vendorForRequest(HOST, '/drive/v3x/files')).toBeUndefined();
		expect(vendorForRequest(HOST, '/gmail/v1/users/me/labels')?.name).toBe('gmail');
		expect(vendorForRequest(HOST, '/upload/other')).toBeUndefined();
		expect(vendorForRequest('docs.googleapis.com', '/v1/documents/x:batchUpdate')?.name).not.toBe(
			'googledrive',
		);
		expect(vendorForRequest('docs.google.com', '/uc')).toBeUndefined();
	});

	it('keeps the token exchange working with two vendors on oauth2.googleapis.com', () => {
		const call = (method: string, path: string) => ({
			method,
			url: new URL(`https://oauth2.googleapis.com${path}`),
		});

		expect(isTokenExchange(call('POST', '/token'))).toBe(true);
		expect(isTokenExchange(call('POST', '/revoke'))).toBe(false);
		expect(vendorForRequest('oauth2.googleapis.com', '/token')).toBeUndefined();
		expect(vendor.passthroughHosts).toEqual(loadVendorKnowledge('gmail').passthroughHosts);
	});

	it('has one profile with its own file name and the Google credential', () => {
		const names = HTTP_PROFILES.map((profile) => profile.name);

		expect(names).toEqual([...new Set(names)]);
		expect(names).toContain('googledrive');
		expect(GOOGLE_DRIVE_PROFILE.credentialKind).toBe('google_oauth');
		expect(GOOGLE_DRIVE_PROFILE.credentialField).toBe('oauthTokenData.access_token');
		expect(GOOGLE_DRIVE_PROFILE.gymService).toBe('google-drive');
	});
});

describe('routing of every operation of the Drive node', () => {
	const vendor = loadVendorKnowledge('googledrive');
	const read = (r: ReturnType<typeof req>) => isReadShaped(r, vendor.readPaths);

	it.each([
		['File/Folder > Search', 'GET', '/drive/v3/files?q=name%20contains%20%27a%27'],
		['File > Get (metadata, download)', 'GET', FILES],
		['File > Download (media)', 'GET', `${FILES}?alt=media`],
		['File > Download (export)', 'GET', `${FILES}/export?mimeType=text%2Fplain`],
		['Shared drive > Get', 'GET', '/drive/v3/drives/0ABcDeFgHiJ'],
		['Shared drive > List', 'GET', '/drive/v3/drives'],
		['File > Move, Copy (read the parents)', 'GET', `${FILES}?fields=parents`],
	])('treats %s as a read', (_name, method, path) => {
		expect(read(req(method, path))).toBe(true);
	});

	it.each([
		['File > Copy', 'POST', `${FILES}/copy`],
		['File > Share, Folder > Share', 'POST', `${FILES}/permissions`],
		['Folder > Create, create from text', 'POST', '/drive/v3/files'],
		['File > Upload (multipart)', 'POST', '/upload/drive/v3/files?uploadType=multipart'],
		['File > Upload (resumable start)', 'POST', '/upload/drive/v3/files?uploadType=resumable'],
		['File > Upload (resumable chunk)', 'PUT', '/upload/drive/v3/files?uploadType=resumable'],
		['File > Update (content)', 'PATCH', `/upload/drive/v3/files/${FILE}?uploadType=media`],
		['File > Update, Move, Upload (metadata)', 'PATCH', FILES],
		['File > Delete, Folder > Delete', 'DELETE', FILES],
		['File > Delete (trash)', 'PATCH', FILES],
		['Shared drive > Create', 'POST', '/drive/v3/drives'],
		['Shared drive > Update', 'PATCH', '/drive/v3/drives/0ABcDeFgHiJ'],
		['Shared drive > Delete', 'DELETE', '/drive/v3/drives/0ABcDeFgHiJ'],
		['empty the trash', 'DELETE', '/drive/v3/files/trash'],
	])('treats %s as a write', (_name, method, path) => {
		const request = req(method, path, {});
		expect(read(request)).toBe(false);
		expect(toToolCall(request, false).name.startsWith('write_')).toBe(true);
	});
});

describe('enrichDrive', () => {
	it('adds the ref of a file and of its parent folder', () => {
		const out = enrichDrive({ id: FILE, name: 'a.txt', mimeType: 'text/plain', parents: [FOLDER] });

		expect(out).toMatchObject({ worldRef: `file:${FILE}`, parentRef: `folder:${FOLDER}` });
	});

	it('names a folder and handles a file without a parent', () => {
		const folder = enrichDrive({ id: FOLDER, name: 'F', mimeType: FOLDER_TYPE }) as Record<
			string,
			unknown
		>;

		expect(folder.worldRef).toBe(`folder:${FOLDER}`);
		expect(folder).not.toHaveProperty('parentRef');
		expect(enrichDrive({ id: FILE, name: 'x', parents: [5] })).not.toHaveProperty('parentRef');
	});

	it('enriches the files of a list and leaves other items and answers as they are', () => {
		const out = enrichDrive({ files: [{ id: FILE, name: 'a' }, 'x', { name: 'no id' }] }) as {
			files: unknown[];
		};

		expect(out.files[0]).toMatchObject({ worldRef: `file:${FILE}` });
		expect(out.files[1]).toBe('x');
		expect(out.files[2]).toEqual({ name: 'no id' });
		expect(enrichDrive({ drives: [] })).toEqual({ drives: [] });
		expect(enrichDrive({ id: 'p', role: 'reader' })).toEqual({ id: 'p', role: 'reader' });
		expect(enrichDrive({ id: '', name: 'x' })).toEqual({ id: '', name: 'x' });
		expect(enrichDrive(null)).toBeNull();
	});
});

describe('Google Drive lookups', () => {
	const lookups = GOOGLE_DRIVE_PROFILE.lookups!;
	const paths = (found: Array<{ args: Record<string, unknown> }>) => found.map((f) => f.args.path);

	it('looks up the file for a read, and the folders that a list shows', () => {
		const result = {
			files: [
				{ id: 'f1', parents: [FOLDER] },
				{ id: FOLDER, parents: ['top'] },
				{ id: 'f3', parents: [FOLDER, 'root'] },
			],
		};
		const found = lookups(
			'read_get_drive_files',
			{ method: 'GET', path: '/drive/v3/files' },
			result,
		);

		expect(paths(found)).toEqual(['/drive/v3/files/top']);
		expect(
			paths(
				lookups(
					'read_get_drive_files',
					{ method: 'GET', path: FILES },
					{ id: FILE, parents: [FOLDER] },
				),
			),
		).toEqual([FILES, `/drive/v3/files/${FOLDER}`]);
	});

	it('looks up the folder that a search names, in a string or an array query', () => {
		const q = `'${FOLDER}' in parents and trashed = false`;

		expect(
			paths(
				lookups('read_get_drive_files', { method: 'GET', path: '/drive/v3/files', query: { q } }),
			),
		).toEqual([`/drive/v3/files/${FOLDER}`]);
		expect(
			paths(
				lookups('read_get_drive_files', {
					method: 'GET',
					path: '/drive/v3/files',
					query: { q: [q] },
				}),
			),
		).toEqual([`/drive/v3/files/${FOLDER}`]);
	});

	it('looks up nothing for a list without folders, or for a collection action', () => {
		expect(
			lookups('read_get_drive_files', { method: 'GET', path: '/drive/v3/files' }, { files: [] }),
		).toEqual([]);
		expect(lookups('read_get_drive_files', { method: 'GET', path: '/drive/v3/files' })).toEqual([]);
		expect(
			lookups('read_get_drive_drives', { method: 'GET', path: '/drive/v3/drives' }, { drives: [] }),
		).toEqual([]);
		expect(
			lookups('write_delete_drive_files', { method: 'DELETE', path: '/drive/v3/files/emptyTrash' }),
		).toEqual([]);
	});

	it('looks up the file of a write, also for a short id, and the folders that it names', () => {
		const found = lookups('write_patch_drive_files', {
			method: 'PATCH',
			path: '/drive/v3/files/notes',
			query: { addParents: `${FOLDER},root`, removeParents: 'oldFolder' },
			body: { parents: ['bodyFolder', 5] },
		});

		expect(paths(found)).toEqual([
			'/drive/v3/files/notes',
			'/drive/v3/files/bodyFolder',
			`/drive/v3/files/${FOLDER}`,
			'/drive/v3/files/oldFolder',
		]);
		const first = found[0].args.query as Record<string, string>;
		expect(first.fields).toContain('parents');
		expect(found[0].tool.startsWith('read_')).toBe(true);
	});

	it('looks up the file of a copy, a share and an update with an encoded id', () => {
		expect(
			paths(
				lookups('write_post_drive_files_copy', { method: 'POST', path: `${FILES}/copy`, body: {} }),
			),
		).toEqual([FILES]);
		expect(
			paths(lookups('write_post_x', { method: 'POST', path: '/upload/drive/v3/files/%E0%A4%A' })),
		).toEqual(['/drive/v3/files/%25E0%25A4%25A']);
		expect(
			lookups('write_post_drive_files', {
				method: 'POST',
				path: '/drive/v3/files',
				body: { name: 'x' },
			}),
		).toEqual([]);
	});

	it('looks up a shared drive for a call that names one', () => {
		expect(
			paths(
				lookups('write_patch_drive_drives', { method: 'PATCH', path: '/drive/v3/drives/0ABc%2Fd' }),
			),
		).toEqual(['/drive/v3/drives/0ABc%2Fd']);
	});

	it('does not copy the bytes of a file to the gym', () => {
		const hydrate = GOOGLE_DRIVE_PROFILE.hydrateRead!;

		expect(hydrate({ method: 'GET', path: FILES, query: { alt: 'media' } }, {})).toBe(false);
		expect(hydrate({ method: 'GET', path: `${FILES}/export` }, {})).toBe(false);
		expect(hydrate({ method: 'GET', path: FILES, query: { fields: 'name' } }, {})).toBe(true);
		expect(hydrate({ method: 'GET', path: '/drive/v3/files' }, {})).toBe(true);
	});

	it('hydrates a write only for a file, folder or drive that the gym did not make', () => {
		const hydrate = GOOGLE_DRIVE_PROFILE.hydrateWrite!;
		const patch = { method: 'PATCH', path: FILES };

		expect(hydrate(patch, new Set())).toBe(true);
		expect(hydrate(patch, new Set([FILE]))).toBe(false);
		expect(
			hydrate({ method: 'POST', path: '/drive/v3/files', body: { parents: [FOLDER] } }, new Set()),
		).toBe(true);
		expect(
			hydrate(
				{ method: 'POST', path: '/drive/v3/files', body: { parents: [FOLDER] } },
				new Set([FOLDER]),
			),
		).toBe(false);
		expect(
			hydrate({ method: 'POST', path: '/drive/v3/files', body: { name: 'x' } }, new Set()),
		).toBe(false);
		expect(hydrate({ method: 'DELETE', path: '/drive/v3/drives/0ABc%2Fd' }, new Set())).toBe(true);
		expect(
			hydrate({ method: 'PATCH', path: FILES, query: { addParents: 'root' } }, new Set([FILE])),
		).toBe(false);
	});

	it('never sends the body of an upload to the model', () => {
		const hydrate = GOOGLE_DRIVE_PROFILE.hydrateWrite!;

		expect(
			hydrate(
				{ method: 'PATCH', path: `/upload/drive/v3/files/${FILE}`, body: 'bytes' },
				new Set(),
			),
		).toBe(false);
		expect(
			hydrate({ method: 'POST', path: '/upload/drive/v3/files', body: 'bytes' }, new Set()),
		).toBe(false);
	});
});

describe('withPlaceholderOwner', () => {
	it('removes owner, sharing, permissions and content under both names of the service', () => {
		const out = withPlaceholderOwner({
			world_version: 1,
			native: {
				google_drive: {
					files: [
						{
							ref: 'f',
							id: FILE,
							name: 'a',
							owner: 'x',
							shared_with: ['y'],
							content: 'c',
							content_base64: 'YQ==',
							body: 'b',
							shared_drive: 'd',
							starred: true,
						},
						5,
					],
					folders: [{ ref: 'g', owner: 'x', name: 'G' }],
					shared_drives: [{ ref: 'd', id: 'D1', name: 'Team', members: ['x'] }],
					permissions: [{ file: 'f', role: 'reader' }],
				},
				'google-drive': { files: [{ owner: 'x', name: 'z' }] },
				other: { keep: true },
			},
		});

		expect(out.native).toEqual({
			google_drive: {
				files: [{ ref: 'f', id: FILE, name: 'a', starred: true }, 5],
				folders: [{ ref: 'g', name: 'G' }],
				shared_drives: [{ ref: 'd', id: 'D1', name: 'Team', members: ['x'] }],
			},
			'google-drive': { files: [{ name: 'z' }] },
			other: { keep: true },
		});
	});

	it('leaves an overlay without the Drive block, or without native data, as it is', () => {
		const plain = { world_version: 1 };

		expect(withPlaceholderOwner(plain)).toBe(plain);
		expect(withPlaceholderOwner({ native: { google_drive: { files: 'x' } } })).toEqual({
			native: { google_drive: { files: 'x' } },
		});
		expect(withPlaceholderOwner({ native: { google_drive: 5 } })).toEqual({
			native: { google_drive: 5 },
		});
	});
});

describe('the guard on a Drive request', () => {
	const result = (body: unknown, status = 200): CallToolResult => ({
		isError: status >= 400,
		content: [{ type: 'text', text: JSON.stringify(body) }],
		_meta: { status, contentType: 'application/json' },
	});

	function setup() {
		const upstream = {
			listTools: vi.fn(async () => []),
			callTool: vi.fn(async (..._a: unknown[]) => result({})),
		};
		const gym = {
			listTools: vi.fn(async () => []),
			callTool: vi.fn(async (..._a: unknown[]) => result({})),
		};
		const hydrator = {
			hydrate: vi.fn(async (..._a: unknown[]) => {}),
			hydrateWrite: vi.fn(async (..._a: unknown[]) => {}),
			noteWrite: vi.fn(),
		};
		const context = { origin: '' } as { authorization?: string; origin: string };
		const router = new HttpGuardRouter({
			upstream: upstream as unknown as McpCaller,
			gym: gym as unknown as McpCaller,
			hydrator,
			profile: GOOGLE_DRIVE_PROFILE,
			context,
		});
		return { router, upstream, gym, hydrator };
	}

	it.each([
		['POST', `${FILES}/copy`],
		['POST', `${FILES}/permissions`],
		['PATCH', FILES],
		['DELETE', FILES],
		['POST', '/drive/v3/files'],
		['POST', '/upload/drive/v3/files?uploadType=multipart'],
		['PUT', '/upload/drive/v3/files?uploadType=resumable&upload_id=secretUpload'],
		['PATCH', `/upload/drive/v3/files/${FILE}?uploadType=media`],
	])('sends %s %s only to the gym', async (method, path) => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(req(method, path, { name: 'x', role: 'reader' }));

		expect(res.status).toBe(200);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('sends an upload with a binary body only to the gym and does not hydrate it', async () => {
		const { router, upstream, gym, hydrator } = setup();
		const binary = Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x89, 0x50]);

		const res = await router.handle(
			req('PATCH', `/upload/drive/v3/files/${FILE}?uploadType=media`, binary),
		);

		expect(res.status).toBe(200);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrateWrite).not.toHaveBeenCalled();
	});

	it('answers an upload that the node sends as a stream (no body) from the gym alone', async () => {
		const { router, upstream, gym } = setup();

		await router.handle({
			...req('POST', '/upload/drive/v3/files?uploadType=resumable'),
			body: undefined,
		});

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('reads the real service for a download and does not copy the bytes to the gym', async () => {
		const { router, upstream, gym, hydrator } = setup();

		await router.handle(req('GET', `${FILES}?alt=media&supportsAllDrives=true`));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrate).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('reads the real service for a search, hydrates, and answers from the gym', async () => {
		const { router, upstream, gym, hydrator } = setup();

		await router.handle(req('GET', '/drive/v3/files?q=name%20contains%20%27a%27'));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('answers a read of a file that the gym made from the gym alone', async () => {
		const { router, upstream, gym, hydrator } = setup();
		gym.callTool.mockResolvedValueOnce(result({ id: FILE }));
		await router.handle(req('POST', '/drive/v3/files', { name: 'new' }));

		await router.handle(req('GET', FILES));
		await router.handle(req('PATCH', FILES, {}));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(hydrator.hydrate).not.toHaveBeenCalled();
		expect(hydrator.hydrateWrite).not.toHaveBeenCalled();
	});

	it('refuses another host and another Google API, and calls nothing', async () => {
		const { router, upstream, gym } = setup();

		const otherHost = await router.handle(req('GET', '/v1/files', undefined, 'example.com'));
		const other = await router.handle(req('GET', '/tasks/v1/users/@me/lists'));

		expect(otherHost.status).toBe(403);
		expect(other.status).toBe(403);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).not.toHaveBeenCalled();
	});

	it('does not put the token, the query or the body in a log line or in a call to the gym', async () => {
		const lines: string[] = [];
		const sink = (line: string) => lines.push(line);
		Container.set(Logger, { info: sink, warn: sink, error: sink } as unknown as Logger);
		const { router, gym, hydrator } = setup();

		await router.handle(req('GET', '/drive/v3/files?q=secretQuery'));
		await router.handle(req('POST', `${FILES}/permissions`, { emailAddress: 'secret@x.test' }));

		const text = lines.join('\n');
		expect(text).toContain('mcp-guard http GET www.googleapis.com/drive/v3/files');
		expect(text).not.toContain('real-token-123');
		expect(text).not.toContain('secretQuery');
		expect(text).not.toContain('secret@x.test');
		const sent = JSON.stringify([gym.callTool.mock.calls, hydrator.hydrate.mock.calls]);
		expect(sent).not.toContain('real-token-123');
	});
});
