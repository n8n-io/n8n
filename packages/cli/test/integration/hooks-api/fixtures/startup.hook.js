// Hook file for startup.test.ts. Records what n8n calls in a JSON-lines file,
// so the test can check it from outside the n8n process.
const { appendFileSync } = require('node:fs');

const record = (event) =>
	appendFileSync(process.env.HOOKS_API_TEST_EVENTS_FILE, `${JSON.stringify(event)}\n`);

/** @type {import('@n8n/hooks-api').RegisterHooks} */
exports.register = async (api) => {
	record({ type: 'register', versions: Object.keys(api), instanceType: api.v1?.instance.type });

	const v1 = api.v1;
	if (!v1) return;

	await v1.ownership.setupOwner({
		email: 'owner@example.com',
		firstName: 'Jane',
		lastName: 'Doe',
		password: 'Password123',
	});

	v1.http?.registerRoute({
		method: 'get',
		path: '/hooks-api-test/executions/:executionId/workflow',
		handler: async ({ params }) => {
			const workflowId = await v1.workflows.getWorkflowIdForExecution(params.executionId);
			return workflowId ? { status: 200, body: { workflowId } } : { status: 404 };
		},
	});

	v1.hooks.workflow.onPreExecute(async (event) => {
		record({ type: 'preExecute', ...event });
		if (event.workflow.name.startsWith('blocked')) throw new Error('Blocked by startup test');
	});
};

exports.n8n = { ready: [async () => record({ type: 'n8n.ready' })] };
