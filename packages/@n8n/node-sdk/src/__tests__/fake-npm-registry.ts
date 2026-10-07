import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';

type Json = Record<string, unknown>;

/** A gzip tar of `files` in `package/`. Only `npmTarballFile` reads it, so a header has only the name and the size. */
const tgzOf = (files: Record<string, string>) =>
	gzipSync(
		Buffer.concat([
			...Object.entries(files).flatMap(([file, text]) => {
				const data = Buffer.from(text);
				const header = Buffer.alloc(512);
				header.write(`package/${file}`, 0);
				header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124);
				return [header, data, Buffer.alloc((512 - (data.length % 512)) % 512)];
			}),
			Buffer.alloc(1024),
		]),
	);

/**
 * An npm registry in memory. It takes the PUT of `npm publish` and `npm deprecate`, and serves
 * packuments and tarballs. `writes` counts each PUT. `put` and `deprecate` change it without npm.
 */
export async function fakeNpmRegistry() {
	const packuments = new Map<string, Json>();
	const tarballs = new Map<string, Buffer>();
	const state = { writes: 0 };
	const server = createServer(async (request, response) => {
		const chunks: Buffer[] = [];
		for await (const chunk of request) chunks.push(chunk as Buffer);
		const route = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/').slice(1);
		response.setHeader('content-type', 'application/json');
		if (request.method === 'PUT') {
			state.writes += 1;
			const name = route.split('/-rev/')[0] ?? route;
			const { _attachments: attachments = {}, ...doc } = JSON.parse(
				Buffer.concat(chunks).toString('utf8'),
			) as Json & { _attachments?: Record<string, { data: string }> };
			for (const [file, { data }] of Object.entries(attachments)) {
				tarballs.set(`${name}/-/${file}`, Buffer.from(data, 'base64'));
			}
			const old = packuments.get(name) ?? { versions: {} };
			packuments.set(name, {
				...old,
				...doc,
				versions: { ...(old.versions as Json), ...(doc.versions as Json) },
				_rev: String(state.writes),
			});
			response.statusCode = 201;
			response.end('{"ok":true}');
			return;
		}
		const tarball = tarballs.get(route);
		if (tarball) {
			response.end(tarball);
			return;
		}
		const packument = packuments.get(route);
		response.statusCode = packument ? 200 : 404;
		response.end(JSON.stringify(packument ?? { error: 'not found' }));
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address() as AddressInfo;
	const url = `http://127.0.0.1:${port}/`;
	const versionsOf = (name: string) => (packuments.get(name)?.versions ?? {}) as Json;
	return {
		url,
		packuments,
		state,
		/** Adds or replaces the version of the package files (see `npmPackageOf`). */
		put: (files: Record<string, string>) => {
			const packageJson = JSON.parse(files['package.json'] ?? '{}') as Json;
			const { name, version } = packageJson as { name: string; version: string };
			const route = `${name}/-/${name.split('/').at(-1)}-${version}.tgz`;
			tarballs.set(route, tgzOf(files));
			packuments.set(name, {
				name,
				versions: {
					...versionsOf(name),
					[version]: { ...packageJson, dist: { tarball: `${url}${route}` } },
				},
			});
		},
		/** Sets the `npm deprecate` message of a version. */
		deprecate: (name: string, version: string, message: string) => {
			const versions = versionsOf(name);
			packuments.set(name, {
				...packuments.get(name),
				versions: {
					...versions,
					[version]: { ...(versions[version] as Json), deprecated: message },
				},
			});
		},
		close: async () => await new Promise((resolve) => server.close(resolve)),
	};
}

/** The registry of `fakeNpmRegistry`. */
export type FakeNpmRegistry = Awaited<ReturnType<typeof fakeNpmRegistry>>;
