import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

const file = open(__ENV.SCRIPT_FILE_PATH, 'b');
const filename = String(__ENV.SCRIPT_FILE_PATH).split('/').pop();

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
