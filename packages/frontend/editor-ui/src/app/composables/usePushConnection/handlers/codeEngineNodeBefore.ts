import type { CodeEngineNodeBefore } from '@n8n/api-types/push/code-engine';
import { useCodeEngineStore } from '@/app/stores/codeEngine.store';

export async function codeEngineNodeBefore({ data }: CodeEngineNodeBefore) {
	const store = useCodeEngineStore();
	store.addExecutingNode(data.nodeId);
}
