import type { CodeEngineNodeAfter } from '@n8n/api-types/push/code-engine';
import { useCodeEngineStore } from '@/app/stores/codeEngine.store';

export async function codeEngineNodeAfter({ data }: CodeEngineNodeAfter) {
	const store = useCodeEngineStore();
	store.removeExecutingNode(data.nodeId);
	store.setNodeOutput(data.nodeId, data.output, data.error);
}
