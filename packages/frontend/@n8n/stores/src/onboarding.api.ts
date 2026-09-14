import { post } from '@n8n/rest-api-client';
import type { IUser } from '@n8n/rest-api-client/api/users';

const N8N_API_BASE_URL = 'https://api.n8n.io/api';
const CONTACT_EMAIL_SUBMISSION_ENDPOINT = '/accounts/onboarding';

export async function submitEmailOnSignup(
	instanceId: string,
	currentUser: IUser,
	email: string | undefined,
	agree: boolean,
): Promise<string> {
	// `post` targets the external onboarding API and is untyped; the response is the
	// created onboarding record id.
	return (await post(N8N_API_BASE_URL, CONTACT_EMAIL_SUBMISSION_ENDPOINT, {
		instance_id: instanceId,
		user_id: `${instanceId}#${currentUser.id}`,
		email,
		agree,
		agree_updates: true,
	})) as string;
}
