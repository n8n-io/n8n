import { BinaryDataStorageRule } from './binary-data-storage.rule';
import { CliActivateAllWorkflowsRule } from './cli-replace-update-workflow-command.rule';
import { DisabledNodesRule } from './disabled-nodes.rule';
import { DotenvUpgradeRule } from './dotenv-upgrade.rule';
import { FileAccessRule } from './file-access.rule';
import { GitNodeBareReposRule } from './git-node-bare-repos.rule';
import { OAuthCallbackAuthRule } from './oauth-callback-auth.rule';
import { ProcessEnvAccessRule } from './process-env-access.rule';
import { PyodideRemovedRule } from './pyodide-removed.rule';
import { QueueWorkerMaxStalledCountRule } from './queue-worker-max-stalled-count.rule';
import { RemovedDatabaseTypesRule } from './removed-database-types.rule';
import { RemovedNodesRule } from './removed-nodes.rule';
import { SettingsFilePermissionsRule } from './settings-file-permissions.rule';
import { SqliteLegacyDriverRule } from './sqlite-legacy-driver.rule';
import { TaskRunnerDockerImageRule } from './task-runner-docker-image.rule';
import { TaskRunnersRule } from './task-runners.rule';
import { TunnelOptionRule } from './tunnel-option.rule';
import { WaitNodeSubworkflowRule } from './wait-node-subworkflow.rule';
import { WorkflowHooksDeprecatedRule } from './workflow-hooks-deprecated.rule';

const v2Rules = [
	// Workflow-level rules
	RemovedNodesRule,
	ProcessEnvAccessRule,
	PyodideRemovedRule,
	FileAccessRule,
	DisabledNodesRule,
	WaitNodeSubworkflowRule,
	GitNodeBareReposRule,
	// Instance-level rules
	DotenvUpgradeRule,
	OAuthCallbackAuthRule,
	CliActivateAllWorkflowsRule,
	WorkflowHooksDeprecatedRule,
	QueueWorkerMaxStalledCountRule,
	TunnelOptionRule,
	RemovedDatabaseTypesRule,
	SettingsFilePermissionsRule,
	TaskRunnersRule,
	TaskRunnerDockerImageRule,
	SqliteLegacyDriverRule,
	BinaryDataStorageRule,
];
export { v2Rules };
