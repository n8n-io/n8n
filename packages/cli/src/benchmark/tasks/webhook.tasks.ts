import axios from 'axios';
import { task, describe } from '../main';

// @TODO: Rename file?

describe('1. Production workflow with authless webhook node', () => {
	const client = axios.create({ baseURL: 'http://localhost:5678/' });

	task('(1.1) using "Respond immediately" mode', async () => {
		await client.get('/webhook/1.1');
	});

	task('(1.2) using "When last node finishes" mode', async () => {
		await client.get('/webhook/1.2');
	});

	task('(1.3) using "Respond to Webhook" node mode', async () => {
		await client.get('/webhook/1.3');
	});
});
