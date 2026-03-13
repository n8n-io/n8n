import type { CodeEngineFinished } from '@n8n/api-types/push/code-engine';
import { useCodeEngineStore } from '@/app/stores/codeEngine.store';

export async function codeEngineFinished({ data }: CodeEngineFinished) {
	const store = useCodeEngineStore();
	store.setExecutionTrace(data.trace);
	store.setWaitingForWebhook(false);
}
