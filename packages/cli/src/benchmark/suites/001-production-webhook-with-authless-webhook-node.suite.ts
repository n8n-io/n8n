import axios from 'axios';
import { task, suite, BACKEND_BASE_URL } from '../lib';

suite('Production workflow with authless webhook node', () => {
	const client = axios.create({ baseURL: BACKEND_BASE_URL });

	task('using "Respond immediately" mode', async () => {
		await client.get('/webhook/001-1');
	});

	task('using "When last node finishes" mode', async () => {
		await client.get('/webhook/001-2');
	});

	task('using "Respond to Webhook" node mode', async () => {
		await client.get('/webhook/001-3');
	});
});
