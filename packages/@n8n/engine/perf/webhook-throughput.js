import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
	stages: [
		{ duration: '10s', target: 10 },
		{ duration: '30s', target: 50 },
		{ duration: '10s', target: 0 },
	],
	thresholds: {
		http_req_duration: ['p(95)<500'],
		http_req_failed: ['rate<0.01'],
	},
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100';

export default function () {
	// Test webhook endpoint throughput
	const payload = JSON.stringify({
		message: `Test message ${Date.now()}`,
		iteration: __ITER,
	});

	const params = {
		headers: {
			'Content-Type': 'application/json',
		},
	};

	const res = http.post(`${BASE_URL}/webhook/echo`, payload, params);

	check(res, {
		'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
		'response has body': (r) => r.body.length > 0,
	});

	sleep(0.1);
}
