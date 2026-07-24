import type { SubworkflowExecutionFinished } from '@n8n/api-types/push/execution';
import { useSubworkflowProgressStore } from '@/app/stores/subworkflowProgress.store';

export async function subworkflowExecutionFinished({ data }: SubworkflowExecutionFinished) {
	useSubworkflowProgressStore().clear({
		parentExecutionId: data.parentExecutionId,
		parentNodeName: data.parentNodeName,
	});
}
