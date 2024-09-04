import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/benchmark-http-node`);

	check(res, {
		'is status 200': (r) => r.status === 200,
		'http requests were OK': (r) =>
			// Response body is an array of the request status codes made with HttpNodes
			JSON.parse(r.body).every((request) => request.statusCode === 200),
	});
}
