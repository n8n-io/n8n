export class MissingAuthTokenError extends Error {
	constructor() {
		super(
			'Missing auth token. `N8N_RUNNERS_AUTH_TOKEN` is required: task runners run as a separate process and authenticate to n8n with this shared secret. Set the same value on n8n and on the task runner launcher. See https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-task-runners',
		);
	}
}
