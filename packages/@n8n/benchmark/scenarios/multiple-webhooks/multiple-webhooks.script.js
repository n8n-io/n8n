import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const urls = Array(10)
		.fill()
		.map((_, i) => `${apiBaseUrl}/webhook/multiple-webhook${i + 1}`);

	const res = http.batch(urls);

	for (let i = 0; i < res.length; i++) {
		// Check if the response status is 200
		check(res[i], {
			'is status 200': (r) => r.status === 200,
		});
	}
}
