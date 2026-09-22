import { AsyncLocalStorage } from 'node:async_hooks';

type WorkflowContentWriteCapability = { available: boolean };

const workflowContentWriteContext = new AsyncLocalStorage<WorkflowContentWriteCapability>();

export const runWorkflowContentWrite = async <T>(write: () => Promise<T>): Promise<T> =>
	await workflowContentWriteContext.run({ available: true }, write);

export const consumeWorkflowContentWrite = () => {
	const capability = workflowContentWriteContext.getStore();
	if (!capability?.available) return false;
	capability.available = false;
	return true;
};
