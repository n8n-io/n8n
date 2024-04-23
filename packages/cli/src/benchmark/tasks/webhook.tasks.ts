import axios from 'axios';
import { task } from '../main.js';

const client = axios.create({ baseURL: 'http://localhost:5678/' });

task(
	'1.1. Production workflow with authless webhook node using "Respond immediately" mode',
	async () => {
		await client.get('/webhook/1.1');
	},
);

task(
	'1.2. Production workflow with authless webhook node using "When last node finishes" mode',
	async () => {
		await client.get('/webhook/1.2');
	},
);

task(
	'1.3. Production workflow with authless webhook node using "Using \'Respond to Webhook\' node" mode',
	async () => {
		await client.get('/webhook/1.3');
	},
);
