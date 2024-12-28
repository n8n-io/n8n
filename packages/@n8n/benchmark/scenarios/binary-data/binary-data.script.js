import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

// This creates a 2MB file (16 * 128 * 1024 = 2 * 1024 * 1024 = 2MB)
const file = Array.from({ length: 128 * 1024 }, () => Math.random().toString().slice(2)).join('');
const filename = 'test.bin';

export default function () {
	const data = {
		filename,
		file: http.file(file, filename, 'application/javascript'),
	};

	const res = http.post(`${apiBaseUrl}/webhook/binary-files-benchmark`, data);

	if (res.status !== 200) {
		console.error(
			`Invalid response. Received status ${res.status}. Body: ${JSON.stringify(res.body)}`,
		);
	}

	check(res, {
		'is status 200': (r) => r.status === 200,
		'has correct content type': (r) =>
			r.headers['Content-Type'] === 'application/javascript; charset=utf-8',
	});
}
