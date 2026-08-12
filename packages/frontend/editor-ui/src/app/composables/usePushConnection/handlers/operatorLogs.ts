import type { OperatorLogsMessage } from '@n8n/api-types/push/operator-console';
import { useOperatorConsoleStore } from '@/features/settings/operatorConsole/operatorConsole.store';

/**
 * Handles the 'operatorLogs' event from the push connection: a batch of log
 * lines for an open operator console. The store discards it unless a console
 * is actually attached.
 */
export async function operatorLogs({ data }: OperatorLogsMessage) {
	const operatorConsoleStore = useOperatorConsoleStore();
	operatorConsoleStore.ingestBatch(data);
}
