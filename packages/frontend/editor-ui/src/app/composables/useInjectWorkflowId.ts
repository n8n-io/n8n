import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { injectStrict } from '@/app/utils/injectStrict';

export function useInjectWorkflowId() {
	return injectStrict(WorkflowIdKey);
}
