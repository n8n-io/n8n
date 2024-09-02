import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/code-node-benchmark`, {});
	check(res, {
		'is status 200': (r) => r.status === 200,
		'has items in response': (r) => JSON.parse(r.body).length === 5,
	});
}
