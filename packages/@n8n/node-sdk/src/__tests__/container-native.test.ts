import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { IBinaryData, INodeParameters } from 'n8n-workflow';

import { freezeAction } from '../freeze';
import { hostRuntime, type BinaryStore, type ExecutorHost } from '../runtime';
import { CONTAINER_GUEST, containerRuntime, type ContainerOptions } from '../runtimes/container';
import { sandboxedVersionOf, type SandboxOptions } from '../sandbox';

const CACHE_ROOT = path.resolve(__dirname, '..', '..', 'node_modules', '.cache');

// Built from `.scratch/runtime-poc/native/<tool>.Dockerfile` as `n8n-poc-native-<tool>`.
const imageIdOf = (tool: string) => {
	try {
		return execFileSync(
			'docker',
			['image', 'inspect', '--format', '{{.Id}}', `n8n-poc-native-${tool}`],
			{
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			},
		).trim();
	} catch {
		return undefined;
	}
};
const images = existsSync(CONTAINER_GUEST)
	? { ffmpeg: imageIdOf('ffmpeg'), chromium: imageIdOf('chromium'), sharp: imageIdOf('sharp') }
	: {};

mkdirSync(CACHE_ROOT, { recursive: true });
const cacheDir = mkdtempSync(path.join(CACHE_ROOT, 'container-native-'));
afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

const PROBES = `import { defineNode, t, type Binaries, type Binary } from '@n8n/node-sdk';
const native = defineNode({ id: 'native', displayName: 'Native' });
const flow = { effect: 'read', cardinality: 'per-item' } as const;
const node = () => {
	if (typeof process === 'undefined') throw new Error('This action needs a Node runtime');
	return {
		fs: process.getBuiltinModule('node:fs'),
		childProcess: process.getBuiltinModule('node:child_process'),
		module: process.getBuiltinModule('node:module'),
		net: process.getBuiltinModule('node:net'),
	};
};
const bytesOf = async (file: Binary) => {
	const chunks: Uint8Array[] = [];
	for await (const chunk of file.read()) chunks.push(chunk);
	return new Uint8Array(await new Blob(chunks).arrayBuffer());
};
const png = async (binary: Binaries, bytes: Uint8Array, fileName: string) =>
	await binary.create({ mimeType: 'image/png', fileName }, [bytes]);
export const thumbnail = native.action('thumbnail', {
	action: 'Thumbnail',
	summary: 'Extract the first frame of a video with ffmpeg.',
	flow,
	input: { video: t.binary() },
	output: t.obj({ thumbnail: t.binary() }),
	async run({ input, binary }) {
		const { fs, childProcess } = node();
		const video = fs.mkdtempSync('/tmp/n8n-') + '/video';
		fs.writeFileSync(video, await bytesOf(input.video));
		const frame = childProcess.execFileSync('/usr/bin/ffmpeg', [
			...['-v', 'error', '-i', video, '-frames:v', '1', '-vf', 'scale=160:-1'],
			...['-c:v', 'png', '-f', 'image2pipe', 'pipe:1'],
		]);
		return { thumbnail: await png(binary, frame, 'thumbnail.png') };
	},
});
export const screenshot = native.action('screenshot', {
	action: 'Screenshot',
	summary: 'Take a screenshot of an HTML page with headless Chromium.',
	flow,
	input: { html: t.str() },
	output: t.obj({ screenshot: t.binary() }),
	async run({ input, binary }) {
		const { fs, childProcess } = node();
		const dir = fs.mkdtempSync('/tmp/n8n-');
		fs.writeFileSync(dir + '/page.html', input.html);
		childProcess.execFileSync('/usr/bin/chromium', [
			...['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
			...['--user-data-dir=' + dir + '/profile', '--screenshot=' + dir + '/shot.png'],
			...['--window-size=640,480', 'file://' + dir + '/page.html'],
		], { env: { HOME: dir }, stdio: 'ignore' });
		return { screenshot: await png(binary, fs.readFileSync(dir + '/shot.png'), 'screenshot.png') };
	},
});
export const resize = native.action('resize', {
	action: 'Resize',
	summary: 'Resize an image with sharp.',
	flow,
	input: { image: t.binary(), width: t.int() },
	output: t.obj({ resized: t.binary() }),
	async run({ input, binary }) {
		const sharp = node().module.createRequire('/opt/native/')('sharp');
		const resized = await sharp(await bytesOf(input.image)).resize(input.width).png().toBuffer();
		return { resized: await png(binary, resized, 'resized.png') };
	},
});
export const exec = native.action('exec', {
	action: 'Exec',
	summary: 'Run a command of the image.',
	flow,
	input: { command: t.arr(t.str()) },
	output: t.obj({ output: t.str() }),
	async run({ input }) {
		const [file = '', ...args] = input.command;
		const { stdout, stderr } = node().childProcess.spawnSync(file, args, { encoding: 'utf8', env: { HOME: '/tmp' } });
		return { output: stdout + stderr };
	},
});
export const connect = native.action('connect', {
	action: 'Connect',
	summary: 'Open a TCP connection.',
	flow,
	input: {},
	output: t.obj({ value: t.str() }),
	async run() {
		const value = await new Promise<string>((resolve) => {
			const socket = node().net.connect(80, '1.1.1.1');
			socket.on('connect', () => resolve('connected')).on('error', (error: NodeJS.ErrnoException) => resolve(error.code ?? error.message));
		});
		return { value };
	},
});
`;

const probe = async (
	name: string,
	options: Omit<ContainerOptions, 'guest'>,
	limits: SandboxOptions['limits'] = {},
) => {
	const file = path.join(cacheDir, 'probes.ts');
	writeFileSync(file, PROBES);
	const { manifest, bundle } = await freezeAction(file, name);
	const { executor } = await sandboxedVersionOf(
		{ manifest, origin: 'private', readBundle: async () => bundle },
		{
			runtime: containerRuntime(options),
			cacheDir,
			credentialType: () => undefined,
			limits: { wallMs: 60_000, ...limits },
		},
		hostRuntime(),
	);
	return executor;
};

const memoryStore = (files: Record<string, Buffer>): BinaryStore => ({
	input: async (_itemIndex, name) => {
		const bytes = typeof name === 'string' ? files[name] : undefined;
		if (!bytes) throw new Error(`The item has no binary field '${String(name)}'`);
		return {
			data: bytes.toString('base64'),
			mimeType: 'application/octet-stream',
			bytes: bytes.length,
		};
	},
	read: async (entry) => Readable.from([Buffer.from(entry.data, 'base64')]),
	write: async (stream, meta) => {
		const chunks: Buffer[] = [];
		for await (const chunk of stream) chunks.push(chunk as Buffer);
		const bytes = Buffer.concat(chunks);
		return {
			data: bytes.toString('base64'),
			mimeType: meta.mimeType ?? 'application/octet-stream',
			...(meta.fileName ? { fileName: meta.fileName } : {}),
			bytes: bytes.length,
		};
	},
});

const hostOf = (parameters: INodeParameters, files: Record<string, Buffer> = {}): ExecutorHost => ({
	items: [{ json: {} }],
	node: { id: '1', name: 'Native', type: 'native', typeVersion: 1, position: [0, 0], parameters },
	parameter: (name) => parameters[name],
	request: async () => await Promise.reject(new Error('no request')),
	continueOnFail: () => false,
	binary: memoryStore(files),
});

const run = async (executor: Awaited<ReturnType<typeof probe>>, host: ExecutorHost) => {
	const [[item] = []] = await executor(host);
	return item;
};

/** The width of a PNG from its IHDR chunk. */
const pngWidthOf = (binary: IBinaryData | undefined) =>
	Buffer.from(binary?.data ?? '', 'base64').readUInt32BE(16);

const dockerOutput = (image: string, command: string[]) =>
	execFileSync('docker', ['run', '--rm', '--network', 'none', image, ...command], {
		maxBuffer: 16 * 1024 * 1024,
	});

const TOOL = { allowChildProcess: true };

describe.skipIf(!images.ffmpeg)('container runtime with ffmpeg', () => {
	const image = images.ffmpeg ?? '';
	const video = () =>
		dockerOutput(image, [
			...['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=10'],
			...['-c:v', 'mpeg4', '-f', 'matroska', 'pipe:1'],
		]);

	it('extracts a thumbnail of a video', async () => {
		const thumbnail = await probe('thumbnail', { image, ...TOOL });
		const item = await run(thumbnail, hostOf({ video: 'video' }, { video: video() }));
		expect(item?.binary?.thumbnail).toMatchObject({
			mimeType: 'image/png',
			fileName: 'thumbnail.png',
		});
		expect(pngWidthOf(item?.binary?.thumbnail)).toBe(160);
	}, 60_000);

	it('refuses a child process without allowChildProcess', async () => {
		const thumbnail = await probe('thumbnail', { image });
		await expect(run(thumbnail, hostOf({ video: 'video' }, { video: video() }))).rejects.toThrow(
			/ERR_ACCESS_DENIED|Access to this API has been restricted/,
		);
	}, 60_000);

	it('reaches no network from ffmpeg or Node', async () => {
		const exec = await probe('exec', { image, ...TOOL });
		const ffmpeg = await run(
			exec,
			hostOf({ command: ['/usr/bin/ffmpeg', '-v', 'error', '-i', 'http://1.1.1.1/a.mp4'] }),
		);
		expect(ffmpeg?.json.output).toContain('Network is unreachable');
		const connect = await probe('connect', { image });
		expect((await run(connect, hostOf({})))?.json.value).toBe('ENETUNREACH');
	}, 60_000);
});

describe.skipIf(!images.chromium)('container runtime with Chromium', () => {
	const image = images.chromium ?? '';
	const options = { image, ...TOOL };
	const limits = { memoryMb: 1024 };

	it('takes a screenshot of an HTML page', async () => {
		const screenshot = await probe('screenshot', options, limits);
		const item = await run(screenshot, hostOf({ html: '<h1>Hello from n8n</h1>' }));
		expect(item?.binary?.screenshot).toMatchObject({ mimeType: 'image/png' });
		expect(pngWidthOf(item?.binary?.screenshot)).toBe(640);
	}, 60_000);

	it('reaches no network from Chromium', async () => {
		const exec = await probe('exec', options, limits);
		const chromium = await run(
			exec,
			hostOf({
				command: [
					...['/usr/bin/chromium', '--headless', '--no-sandbox', '--disable-gpu'],
					...[
						'--disable-dev-shm-usage',
						'--user-data-dir=/tmp/profile',
						'--dump-dom',
						'http://1.1.1.1/',
					],
				],
			}),
		);
		expect(chromium?.json.output).toContain('net::ERR_INTERNET_DISCONNECTED');
	}, 60_000);
});

describe.skipIf(!images.sharp)('container runtime with sharp', () => {
	const image = images.sharp ?? '';
	const png = () =>
		dockerOutput(image, [
			'node',
			'-e',
			"require('/opt/native/node_modules/sharp')({ create: { width: 320, height: 240, channels: 3, background: '#c00' } }).png().toBuffer().then((b) => process.stdout.write(b))",
		]);

	it('resizes a PNG with the native addon of the image', async () => {
		const resize = await probe('resize', { image, allowAddons: ['/opt/native'] });
		const item = await run(resize, hostOf({ image: 'image', width: 64 }, { image: png() }));
		expect(pngWidthOf(item?.binary?.resized)).toBe(64);
	}, 60_000);

	it('refuses the native addon without allowAddons', async () => {
		const resize = await probe('resize', { image });
		await expect(
			run(resize, hostOf({ image: 'image', width: 64 }, { image: png() })),
		).rejects.toThrow(/ERR_ACCESS_DENIED|Access to this API has been restricted/);
	}, 60_000);

	it('reaches no network from Node', async () => {
		const connect = await probe('connect', { image });
		expect((await run(connect, hostOf({})))?.json.value).toBe('ENETUNREACH');
	}, 60_000);
});
