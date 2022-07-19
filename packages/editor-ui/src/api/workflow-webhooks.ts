import { IOnboardingCallPromptResponse, IRestApiContext, IUser } from "@/Interface";
import { get, post } from "./helpers";

// TODO: Replace this with production urls when the merged
const N8N_API_BASE_URL = 'https://api-staging.n8n.io/api';
const ONBOARDING_PROMPTS_ENDPOINT = '/prompts/onboarding';
const CONTACT_EMAIL_SUBMISSION_ENDPOINT = '/accounts/onboarding';

export async function fetchNextOnboardingPrompt(instanceId: string, currentUer: IUser): Promise<IOnboardingCallPromptResponse> {
	return await get(
		N8N_API_BASE_URL,
		ONBOARDING_PROMPTS_ENDPOINT,
		{
			instance_id: instanceId,
			user_id: currentUer.id,
			is_owner: currentUer.isOwner,
			survey_results: currentUer.personalizationAnswers,
		},
	);
}

export async function applyForOnboardingCall(instanceId: string, currentUer: IUser, email: string): Promise<string> {
	return await post(
		N8N_API_BASE_URL,
		ONBOARDING_PROMPTS_ENDPOINT,
		{
			instance_id: instanceId,
			user_id: currentUer.id,
			email,
		},
	);
}

export async function submitEmailOnSignup(instanceId: string, currentUer: IUser, email: string, agree: boolean): Promise<string> {
	return await post(
		N8N_API_BASE_URL,
		CONTACT_EMAIL_SUBMISSION_ENDPOINT,
		{
			instance_id: instanceId,
			user_id: currentUer.id,
			email,
			agree,
		},
	);
}
