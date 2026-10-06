import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { IBinaryData } from 'n8n-workflow';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { downloadFile } from '../../nodes/http-request/actions/download';
import { sendRequest } from '../../nodes/http-request/actions/send';
import { actionNode, binaryDataService, runNode, useRealHttp } from './harness';

const MB = 1024 * 1024;
const SIZE = 50 * MB;
const CHUNK = 64 * 1024;

/** The same 50 MB on each call, made chunk by chunk. */
function* fileChunks() {
	for (const index of Array(SIZE / CHUNK).keys()) yield Buffer.alloc(CHUNK, index % 251);
}

const sha256Of = (chunks: Iterable<Buffer>) =>
	[...chunks].reduce((hash, chunk) => hash.update(chunk), createHash('sha256')).digest('hex');

// The flag works after start, so the test needs no node option.
setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;

interface Peak {
	heapUsed: number;
	arrayBuffers: number;
	rss: number;
}

/**
 * The largest growth of the JS heap, of Buffer memory, and of the process while `run` runs.
 * With `live`, each sample collects garbage first, so it counts only memory still held.
 */
async function peakDuring<T>(
	run: () => Promise<T>,
	{ live }: { live: boolean },
): Promise<{ result: T; peak: Peak }> {
	gc();
	const base = process.memoryUsage();
	const peak: Peak = { heapUsed: 0, arrayBuffers: 0, rss: 0 };
	const sample = () => {
		if (live) gc();
		const now = process.memoryUsage();
		peak.heapUsed = Math.max(peak.heapUsed, now.heapUsed - base.heapUsed);
		peak.arrayBuffers = Math.max(peak.arrayBuffers, now.arrayBuffers - base.arrayBuffers);
		peak.rss = Math.max(peak.rss, now.rss - base.rss);
	};
	const timer = setInterval(sample, live ? 10 : 1);
	try {
		const result = await run();
		sample();
		return { result, peak };
	} finally {
		clearInterval(timer);
	}
}

const inMb = (peak: Peak) =>
	Object.fromEntries(Object.entries(peak).map(([key, bytes]) => [key, +(bytes / MB).toFixed(1)]));

describe('a 50 MB file through download and send, filesystem storage', () => {
	const servers: Server[] = [];
	const received = { bytes: 0, sha256: '' };
	const urls = { file: '', sink: '' };
	const mock = { activate: () => {} };

	const listen = async (server: Server) => {
		servers.push(server);
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	};

	beforeAll(async () => {
		mock.activate = useRealHttp();
		await binaryDataService().init();
		urls.file = `${await listen(
			createServer((_request, response) => {
				response.writeHead(200, {
					'content-type': 'application/octet-stream',
					'content-length': SIZE,
					'content-disposition': 'attachment; filename="large.bin"',
				});
				// `next()`, not `for...of`: leaving a `for...of` early closes the generator.
				const chunks = fileChunks();
				const pump = (): void => {
					const next = chunks.next();
					if (next.done) {
						response.end();
					} else if (response.write(next.value)) {
						pump();
					} else {
						response.once('drain', pump);
					}
				};
				pump();
			}),
		)}/large.bin`;
		urls.sink = `${await listen(
			createServer((request, response) => {
				const hash = createHash('sha256');
				received.bytes = 0;
				request.on('data', (chunk: Buffer) => {
					received.bytes += chunk.length;
					hash.update(chunk);
				});
				request.on('end', () => {
					received.sha256 = hash.digest('hex');
					response.writeHead(200, { 'content-type': 'application/json' });
					response.end(JSON.stringify({ received: received.bytes }));
				});
			}),
		)}/upload`;
	});

	afterAll(async () => {
		mock.activate();
		await Promise.all(
			servers.map(async (server) => await new Promise((resolve) => server.close(resolve))),
		);
	});

	const downloadRun = async () =>
		await runNode(actionNode(downloadFile, { authentication: 'none', url: urls.file }), {
			input: [{}],
			routes: [],
		});

	const sendRun = async (file: IBinaryData) =>
		await runNode(
			actionNode(sendRequest, {
				authentication: 'none',
				method: 'POST',
				url: urls.sink,
				body: { kind: 'binary', file: 'data' },
			}),
			{ input: [{}], binary: { data: file }, routes: [] },
		);

	it('never holds the file in memory', async () => {
		const download = await peakDuring(downloadRun, { live: true });
		expect(download.result.error).toBeUndefined();
		const file = download.result.output[0]?.binary?.data;
		if (!file) throw new Error('The download gave no file');
		expect(file).toMatchObject({ fileName: 'large.bin', bytes: SIZE, data: 'filesystem-v2' });
		expect(file.id).toMatch(/^filesystem-v2:/);

		// The instrument check: a read into one Buffer shows the full size.
		const buffered = await peakDuring(async () => await binaryDataService().getAsBuffer(file), {
			live: true,
		});
		expect(buffered.result.length).toBe(SIZE);

		const send = await peakDuring(async () => await sendRun(file), { live: true });
		expect(send.result.error).toBeUndefined();
		expect(send.result.items[0]?.json).toEqual({ received: SIZE });
		expect(received).toEqual({ bytes: SIZE, sha256: sha256Of(fileChunks()) });

		// Without forced collection, the numbers also hold chunks that wait for the collector.
		const downloadRaw = await peakDuring(downloadRun, { live: false });
		const sendRaw = await peakDuring(async () => await sendRun(file), { live: false });

		const report = JSON.stringify({
			live: { download: inMb(download.peak), send: inMb(send.peak) },
			withGarbage: { download: inMb(downloadRaw.peak), send: inMb(sendRaw.peak) },
			bufferedRead: inMb(buffered.peak),
		});
		process.stdout.write(`binary memory (MB): ${report}\n`);
		expect(buffered.peak.arrayBuffers, report).toBeGreaterThanOrEqual(SIZE);
		for (const { peak } of [download, send]) {
			expect(peak.heapUsed + peak.arrayBuffers, report).toBeLessThan(SIZE / 10);
		}
	}, 120_000);
});
