import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

// This creates a ~2MB JSON file
const file = JSON.stringify(Array.from({ length: 100 * 1024 }, () => Math.random()));
const filename = 'test.json';

export default function () {
	const data = {
		filename,
		file: http.file(file, filename, 'application/javascript'),
	};

	const res = http.post(`${apiBaseUrl}/webhook/binary-files-benchmark`, data);

	check(res, {
		'is status 200': (r) => r.status === 200,
		'has correct content type': (r) =>
			r.headers['Content-Type'] === 'application/javascript; charset=utf-8',
	});
}
