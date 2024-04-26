import { task, suite, agent } from '../lib';

suite('Production workflow with authless webhook node', () => {
	task('using "Respond immediately" mode', async () => {
		await agent.get('/webhook/001-1');
	});

	task('using "When last node finishes" mode', async () => {
		await agent.get('/webhook/001-2');
	});

	task('using "Respond to Webhook node" mode', async () => {
		await agent.get('/webhook/001-3');
	});
});
