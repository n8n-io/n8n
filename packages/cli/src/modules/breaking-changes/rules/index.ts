// Side-effect imports: the @BreakingChangeRule decorator on each class
// registers it in BreakingChangeRuleMetadata when the file is loaded.

// v2 rules
import './v2/binary-data-storage.rule';
import './v2/cli-replace-update-workflow-command.rule';
import './v2/disabled-nodes.rule';
import './v2/dotenv-upgrade.rule';
import './v2/file-access.rule';
import './v2/oauth-callback-auth.rule';
import './v2/process-env-access.rule';
import './v2/pyodide-removed.rule';
import './v2/queue-worker-max-stalled-count.rule';
import './v2/removed-nodes.rule';
import './v2/settings-file-permissions.rule';
import './v2/start-node-removed.rule';
import './v2/task-runner-docker-image.rule';
import './v2/tunnel-option.rule';
import './v2/wait-node-subworkflow.rule';
import './v2/workflow-hooks-deprecated.rule';
