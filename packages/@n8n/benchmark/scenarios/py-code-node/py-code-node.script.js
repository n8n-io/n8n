import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/py-code-node-benchmark`, {});

	if (res.status !== 200) {
		console.error(
			`Invalid response. Received status ${res.status}. Body: ${JSON.stringify(res.body)}`,
		);
	}

	check(res, {
		'is status 200': (r) => r.status === 200,
		'has items in response': (r) => {
			if (r.status !== 200) return false;

			try {
				const body = JSON.parse(r.body);
				return Array.isArray(body) ? body.length === 100 : false;
			} catch (error) {
				console.error('Error parsing response body: ', error);
				return false;
			}
		},
	});
}
