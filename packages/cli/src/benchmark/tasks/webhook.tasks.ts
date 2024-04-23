import axios from 'axios';
import { task, beforeEach } from '../main.js';

const client = axios.create({
	baseURL: 'http://localhost:5678/',
});

beforeEach(async () => {
	await client.post('/rest/login', {
		email: 'test@test.com',
		password: 'password',
	});
});

task(
	'1.1. Production workflow with authless webhook node using "Respond immediately" mode',
	async () => {
		await client.get('/webhook/d58b0160-2370-417b-bc0e-f3050b0c7adf');
	},
);

task(
	'1.2. Production workflow with authless webhook node using "When last node finishes" mode',
	async () => {
		await client.get('/webhook/a669d108-7de3-4e72-b332-919a11b2328b');
	},
);

task(
	'1.3. Production workflow with authless webhook node using "Using \'Respond to Webhook\' node" mode',
	async () => {
		await client.get('/webhook/c143e038-b0bd-46ca-9708-33b868499c61');
	},
);
