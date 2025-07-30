import { Container } from '@n8n/di';
import { LegacySqliteExecutionRecoveryService } from './legacy-sqlite-execution-recovery.service';

export async function startLegacyRecovery() {
	await Container.get(LegacySqliteExecutionRecoveryService).cleanupWorkflowExecutions();
}
