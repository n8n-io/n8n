import { BinaryDataStorageRule } from './binary-data-storage.rule';
import { DisabledNodesRule } from './disabled-nodes.rule';
import { DotenvUpgradeRule } from './dotenv-upgrade.rule';
import { FileAccessRule } from './file-access.rule';
import { OAuthCallbackAuthRule } from './oauth-callback-auth.rule';
import { ProcessEnvAccessRule } from './process-env-access.rule';
import { QueueWorkerMaxStalledCountRule } from './queue-worker-max-stalled-count.rule';
import { RemovedDatabaseTypesRule } from './removed-database-types.rule';
import { RemovedNodesRule } from './removed-nodes.rule';
import { SettingsFilePermissionsRule } from './settings-file-permissions.rule';
import { SqliteLegacyDriverRule } from './sqlite-legacy-driver.rule';
import { TaskRunnersRule } from './task-runners.rule';
import { TunnelOptionRule } from './tunnel-option.rule';

const v2Rules = [
	// Workflow-level rules
	RemovedNodesRule,
	ProcessEnvAccessRule,
	FileAccessRule,
	DisabledNodesRule,
	// Instance-level rules
	DotenvUpgradeRule,
	OAuthCallbackAuthRule,
	QueueWorkerMaxStalledCountRule,
	TunnelOptionRule,
	RemovedDatabaseTypesRule,
	SettingsFilePermissionsRule,
	TaskRunnersRule,
	SqliteLegacyDriverRule,
	BinaryDataStorageRule,
];
export { v2Rules };
