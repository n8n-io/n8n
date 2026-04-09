import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { data, port, tmp, indexPath } from './config.js';

const statusCodes = {
	ENOENT: 404,
};

try {
	execSync(`npm exec make-index -- ${data} --output ${tmp}/index.json --quiet`, { stdio: 'inherit' });
} catch (e) {
	if (e.signal == 'SIGINT') {
		console.log('Aborted whilst creating index');
		process.exit(0);
	} else {
		console.error('Index creation failed: ' + e.message);
		process.exit(1);
	}
}

const server = createServer((request, response) => {
	response.statusCode = 200;
	const { url = '', method } = request;

	/**
	 * @todo Test POST/DELETE
	 */
	if (method != 'GET') {
		response.end();
		return;
	}

	if (url == '/.ping') {
		response.end('pong');
		return;
	}

	const path = url == indexPath ? join(tmp, 'index.json') : join(data, url.slice(1) || '');
	try {
		response.end(readFileSync(path));
	} catch (e) {
		response.statusCode = statusCodes[e.code] || 400;
		response.end();
	}
});

server.listen(port);

process.on('beforeExit', () => {
	server.close().unref();
});
