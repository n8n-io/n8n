import axios from 'axios';
import { task, beforeEach } from '../main.js';

async function login() {
	const client = axios.create({
		baseURL: 'http://localhost:5678/',
	});

	await client.post('/rest/login', {
		email: 'test@test.com',
		password: 'password',
	});
}

beforeEach(async () => {
	await login();
});

task('Production workflow - webhook node - no auth - respond immediately', async () => {
	// @TODO: setup for this task

	// const wf = Container.get(WorkflowRepository).create(
	// 	ProductionWorkflow as unknown as WorkflowEntity,
	// );
	// await Container.get(WorkflowRepository).save(wf);
	// console.log('wf', wf);
	console.log('[first] Task 1 executed');
});

task('[first] Task 2 should do something else', async () => {
	console.log('[first] Task 2 executed');
});
