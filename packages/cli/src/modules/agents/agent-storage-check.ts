import type { Logger } from '@n8n/backend-common';
import type { BinaryDataConfig } from 'n8n-core';

import type { AgentClusterService } from './agent-cluster.service';

/**
 * Agent chat attachments and files go through the binary data service. In
 * queue mode, another process can read a file that this process wrote: a
 * second main, or a worker. Filesystem storage keeps the file on the disk of
 * the process that wrote it, so the other process cannot find it unless all
 * processes share one volume.
 *
 * Returns true when it logged the warning.
 */
export function warnIfAgentFilesAreLocal(
	cluster: AgentClusterService,
	binaryDataConfig: Pick<BinaryDataConfig, 'mode'>,
	logger: Pick<Logger, 'warn'>,
): boolean {
	if (!cluster.shouldRelayAcrossProcesses() || binaryDataConfig.mode !== 'filesystem') {
		return false;
	}

	logger.warn(
		'[Agents] Binary data uses filesystem storage in queue mode. Agent chat attachments and ' +
			'files written by one n8n process are not visible to other processes unless all ' +
			'processes share the same storage volume. Set N8N_DEFAULT_BINARY_DATA_MODE to ' +
			'"database" or "s3" to share agent files across processes.',
	);
	return true;
}
