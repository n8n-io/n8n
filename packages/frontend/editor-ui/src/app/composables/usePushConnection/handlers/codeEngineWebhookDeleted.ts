import { useCodeEngineStore } from '@/app/stores/codeEngine.store';

export async function codeEngineWebhookDeleted() {
	const store = useCodeEngineStore();
	store.setWaitingForWebhook(false);
	store.setWebhookTimedOut(true);
}
