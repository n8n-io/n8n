// Side-effect imports: the @BreakingChangeRule decorator on each class
// registers it in BreakingChangeRuleMetadata when the file is loaded.

// v2 rules
import './v2/binary-data-storage.rule.js';
import './v2/cli-replace-update-workflow-command.rule.js';
import './v2/disabled-nodes.rule.js';
import './v2/dotenv-upgrade.rule.js';
import './v2/file-access.rule.js';
import './v2/oauth-callback-auth.rule.js';
import './v2/process-env-access.rule.js';
import './v2/pyodide-removed.rule.js';
import './v2/queue-worker-max-stalled-count.rule.js';
import './v2/removed-nodes.rule.js';
import './v2/settings-file-permissions.rule.js';
import './v2/start-node-removed.rule.js';
import './v2/task-runner-docker-image.rule.js';
import './v2/tunnel-option.rule.js';
import './v2/wait-node-subworkflow.rule.js';
import './v2/workflow-hooks-deprecated.rule.js';

// v3 rules
import './v3/always-output-data-multi-output.rule.js';
import './v3/compression-node-limits.rule.js';
import './v3/docker-only-deployment.rule.js';
import './v3/execute-workflow-each-mode.rule.js';
import './v3/get-paired-item.rule.js';
import './v3/in-memory-binary-data.rule.js';
import './v3/offload-manual-executions.rule.js';
import './v3/task-runner-task-timeout.rule.js';
import './v3/unverified-packages.rule.js';
import './v3/workflow-import-url-removed.rule.js';
