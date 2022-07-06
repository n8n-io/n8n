import { IOnboardingCallPromptResponse } from "@/Interface";
import { get } from "./helpers";

export async function fetchNextOnboardingPrompt(): Promise<IOnboardingCallPromptResponse> {
	// TODO: Update webhook URL once the workflow is updated
	return await get('https://milorad.app.n8n.cloud/webhook', '/46a6a97e-dff8-43bb-8085-535a9455bb0a', {}, { 'Content-Type': 'text/plain' });
}
