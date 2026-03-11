import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
	vus: 5,
	duration: '30s',
	thresholds: {
		http_req_duration: ['p(95)<2000'],
		http_req_failed: ['rate<0.05'],
	},
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100';

// Pre-created workflow ID -- set via environment variable
const WORKFLOW_ID = __ENV.WORKFLOW_ID;

export default function () {
	if (!WORKFLOW_ID) {
		console.error('Set WORKFLOW_ID environment variable');
		return;
	}

	// Start an execution
	const startRes = http.post(
		`${BASE_URL}/api/workflow-executions`,
		JSON.stringify({
			workflowId: WORKFLOW_ID,
			triggerData: { iteration: __ITER, timestamp: Date.now() },
			mode: 'test',
		}),
		{ headers: { 'Content-Type': 'application/json' } },
	);

	check(startRes, {
		'execution started': (r) => r.status === 201,
	});

	if (startRes.status !== 201) return;

	const { executionId } = JSON.parse(startRes.body);

	// Poll for completion (max 10 attempts, 200ms apart)
	let completed = false;
	for (let i = 0; i < 10; i++) {
		sleep(0.2);
		const statusRes = http.get(`${BASE_URL}/api/workflow-executions/${executionId}`);
		if (statusRes.status === 200) {
			const execution = JSON.parse(statusRes.body);
			if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
				completed = true;
				check(execution, {
					'execution completed': (e) => e.status === 'completed',
					'has duration': (e) => e.durationMs != null,
				});
				break;
			}
		}
	}

	check(
		{ completed },
		{
			'execution finished within timeout': (obj) => obj.completed,
		},
	);
}
