import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const res = http.get(`${apiBaseUrl}/webhook/code-node`);
	check(res, {
		'is status 200': (r) => r.status === 200,
	});
}
