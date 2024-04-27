import axios from 'axios';
import { BACKEND_BASE_URL, INSTANCE_ONWER } from './constants';
import { ApplicationError } from 'n8n-workflow';

export const agent = axios.create({ baseURL: BACKEND_BASE_URL });

export async function authenticateAgent() {
	const response = await agent.post('/rest/login', {
		email: INSTANCE_ONWER.EMAIL,
		password: INSTANCE_ONWER.PASSWORD,
	});

	const cookies = response.headers['set-cookie'];

	if (!cookies || cookies.length !== 1) {
		throw new ApplicationError('Expected cookie', { level: 'warning' });
	}

	const [cookie] = cookies;

	agent.defaults.headers.Cookie = cookie;
	agent.defaults.headers['x-n8n-api-key'] = INSTANCE_ONWER.API_KEY;
}
