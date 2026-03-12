/**
 * F25: Execution with HTTP Mocking
 *
 * Demonstrates a workflow that fetches data from an API.
 * The original v4 fixture uses nock for HTTP mocking in tests.
 * In v3, this is a straightforward fetch() call — the mocking
 * concern is handled by the test infrastructure, not the workflow.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F25 - Exec Http Nock',
	triggers: [webhook('/f25-exec-http-nock', { method: 'POST' })],
	async run(ctx) {
		const data = await ctx.step({ name: 'Fetch Data' }, async () => {
			const res = await fetch('https://dummyjson.com/users?limit=10');
			return (await res.json()) as { users: Array<{ firstName: string }> };
		});

		return data;
	},
});
