import { IOnboardingCallPromptResponse, IUser } from "@/Interface";
import { get } from "./helpers";

// TODO: Replace this with production when the workflow is ready
const N8N_WF_WEBHOOK_BASE_URL = 'https://internal.users.n8n.cloud/webhook';
const N8N_ONBOARDING_CALL_PROMPT_WEBHOOK_PATH = '56f4e271-4e9f-4b38-b21e-0fa2d51132mn';

export async function fetchNextOnboardingPrompt(instanceId: string, currentUer: IUser): Promise<IOnboardingCallPromptResponse> {
	return await get(
		N8N_WF_WEBHOOK_BASE_URL,
		`/${N8N_ONBOARDING_CALL_PROMPT_WEBHOOK_PATH}`,
		{
			instance_id: instanceId,
			user_id: currentUer.id,
			is_owner: currentUer.isOwner,
			survey_results: currentUer.personalizationAnswers,
		},
	);
}
