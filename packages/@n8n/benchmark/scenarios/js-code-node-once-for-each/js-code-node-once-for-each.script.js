import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/code-node-benchmark`, {});
	check(res, {
		'is status 200': (r) => r.status === 200,
		'has items in response': (r) => {
			if (r.status !== 200) return false;

			try {
				const body = JSON.parse(r.body);
				return Array.isArray(body) ? body.length === 5 : false;
			} catch (error) {
				console.error('Error parsing response body: ', error);
				return false;
			}
		},
	});
}
