// Local sink for the telemetry clients of the stand (see ../SKILL.md). Answers 200 to everything
// and appends one JSON line per request to the log file: {at, method, url, body}.
const http = require('node:http');
const fs = require('node:fs');
const zlib = require('node:zlib');

const port = Number(process.argv[2] ?? 4545);
const logFile = process.argv[3] ?? 'capture.log';

http
	.createServer((req, res) => {
		const chunks = [];
		req.on('data', (chunk) => chunks.push(chunk));
		req.on('end', () => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Headers', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
			if (req.method === 'OPTIONS') {
				res.writeHead(204);
				res.end();
				return;
			}
			if (req.url.endsWith('.js')) {
				// posthog-js loads its bundle from the API host; an empty script keeps the page quiet.
				res.writeHead(200, { 'Content-Type': 'application/javascript' });
				res.end('// stand');
				return;
			}
			let body = Buffer.concat(chunks);
			if (req.headers['content-encoding'] === 'gzip') {
				try {
					body = zlib.gunzipSync(body);
				} catch {
					// keep the raw bytes
				}
			}
			fs.appendFileSync(
				logFile,
				JSON.stringify({
					at: new Date().toISOString(),
					method: req.method,
					url: req.url,
					body: body.toString('utf8'),
				}) + '\n',
			);
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end('{}');
		});
	})
	.listen(port, '127.0.0.1', () => {
		console.log(`[capture] listening on http://127.0.0.1:${port}, log: ${logFile}`);
	});
