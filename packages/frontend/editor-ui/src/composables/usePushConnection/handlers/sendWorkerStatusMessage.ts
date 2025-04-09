import type { SendWorkerStatusMessage } from '@n8n/api-types';
import { useOrchestrationStore } from '@/stores/orchestration.store';

export async function sendWorkerStatusMessage({ data }: SendWorkerStatusMessage) {
	const orchestrationStore = useOrchestrationStore();
	orchestrationStore.updateWorkerStatus(data.status);
}
