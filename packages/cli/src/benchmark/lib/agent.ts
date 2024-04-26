import axios from 'axios';
import { BACKEND_BASE_URL, INSTANCE_ONWER_EMAIL, INSTANCE_ONWER_PASSWORD } from './constants';
import { ApplicationError } from 'n8n-workflow';

export const agent = axios.create({ baseURL: BACKEND_BASE_URL });

export async function authenticateAgent() {
	const response = await agent.post('/rest/login', {
		email: INSTANCE_ONWER_EMAIL,
		password: INSTANCE_ONWER_PASSWORD,
	});

	const cookies = response.headers['set-cookie'];

	if (!cookies || cookies.length !== 1) {
		throw new ApplicationError('Expected cookie', { level: 'warning' });
	}

	const [cookie] = cookies;

	agent.defaults.headers.Cookie = cookie;
}
