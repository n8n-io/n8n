/**
 * Scaling Load Test
 *
 * Executes a perf workflow repeatedly under load.
 * Default: "Light Test" (4 steps, minimal CPU) for throughput testing.
 * Use WORKFLOW_NAME env var to switch to "Stress Test" (10 CPU-heavy steps).
 *
 * Usage:
 *   k6 run perf/scaling-load.js                                    # Light test
 *   WORKFLOW_NAME="Stress Test" k6 run perf/scaling-load.js        # Stress test
 *   VUS=100 DURATION=5m k6 run perf/scaling-load.js                # Custom load
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100';
const WORKFLOW_NAME = __ENV.WORKFLOW_NAME || 'Light Test';
const VUS = parseInt(__ENV.VUS || '50');
const DURATION = __ENV.DURATION || '3m';

export const options = {
	stages: [
		{ duration: '15s', target: Math.ceil(VUS * 0.2) },
		{ duration: '30s', target: VUS },
		{ duration: DURATION, target: VUS },
		{ duration: '15s', target: 0 },
	],
	thresholds: {
		http_req_duration: ['p(95)<5000'],
		http_req_failed: ['rate<0.05'],
	},
};

export function setup() {
	// Retry setup — Traefik may return 502 if engines are still starting
	let workflows = null;
	for (let attempt = 1; attempt <= 10; attempt++) {
		const res = http.get(`${BASE_URL}/api/workflows`);
		if (res.status === 200) {
			try {
				workflows = JSON.parse(res.body);
				break;
			} catch (_) {
				// Non-JSON response (e.g., Bad Gateway)
			}
		}
		console.log(`Setup attempt ${attempt}/10 failed (status ${res.status}), retrying in 3s...`);
		sleep(3);
	}

	if (!workflows) {
		console.error('Could not connect to engine API after 10 attempts');
		return { workflowId: null };
	}

	const target = workflows.find((w) => w.name === WORKFLOW_NAME);
	if (!target) {
		console.error(`Workflow "${WORKFLOW_NAME}" not found. Seed it first via the API.`);
		return { workflowId: null };
	}

	console.log(`Using workflow: ${target.name} (${target.id})`);
	console.log(`VUs: ${VUS}, Duration: ${DURATION}`);
	return { workflowId: target.id };
}

export default function (data) {
	if (!data.workflowId) return;

	const exec = http.post(
		`${BASE_URL}/api/workflow-executions`,
		JSON.stringify({ workflowId: data.workflowId }),
		{ headers: { 'Content-Type': 'application/json' } },
	);
	check(exec, {
		'start execution': (r) => r.status === 200 || r.status === 201,
	});

	sleep(0.1);
}
