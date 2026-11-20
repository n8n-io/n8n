import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

// Run each server in a child process to check stream errors after the response.
const checkCompressedRequest = `
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { setTimeout } = require('node:timers/promises');
const { gzipSync } = require('node:zlib');
const express = require(process.argv[1]);

(async () => {
  const app = express();
  app.use(express.json());
  app.post('/', (_req, res) => res.sendStatus(204));
  app.use((_error, _req, res, _next) => res.sendStatus(400));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const send = (body) => new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port: server.address().port, method: 'POST', agent: false,
      headers: {
        'content-type': 'application/json', 'content-encoding': 'gzip',
        'content-length': body.length,
      },
    }, (response) => {
      response.resume();
      response.on('error', reject);
      response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.setTimeout(2000, () => request.destroy(new Error('Request did not finish')));
    request.end(body);
  });

  try {
    const body = gzipSync('{}');
    const input = process.argv[2] === 'continued'
      ? Buffer.concat([body, Buffer.from([0]), Buffer.alloc(100 * 1024, 0x58)]) : body;
    assert.equal(await send(input), 204);
    await setTimeout(200);
    assert.equal(await send(body), 204);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
`;

describe('Express JSON middleware', () => {
	it.each(['complete', 'continued'])(
		'should handle %s compressed input and accept the next request',
		async (input) => {
			await execFileAsync(
				process.execPath,
				[
					'--input-type=commonjs',
					'--eval',
					checkCompressedRequest,
					require.resolve('express'),
					input,
				],
				{ timeout: 10_000 },
			);
		},
	);
});
