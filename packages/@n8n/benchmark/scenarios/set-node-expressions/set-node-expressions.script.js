import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/set-expressions-benchmark`, {});
	check(res, {
		'is status 200': (r) => r.status === 200,
	});
}
