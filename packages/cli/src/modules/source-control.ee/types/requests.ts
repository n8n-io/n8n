import type { AuthenticatedRequest } from '@n8n/db';

import type { SourceControlCommit } from './source-control-commit.js';
import type { SourceControlDisconnect } from './source-control-disconnect.js';
import type { SourceControlGenerateKeyPair } from './source-control-generate-key-pair.js';
import type { SourceControlGetStatus } from './source-control-get-status.js';
import type { SourceControlPreferences } from './source-control-preferences.js';
import type { SourceControlPush } from './source-control-push.js';
import type { SourceControlSetBranch } from './source-control-set-branch.js';
import type { SourceControlSetReadOnly } from './source-control-set-read-only.js';
import type { SourceControlStage } from './source-control-stage.js';

export declare namespace SourceControlRequest {
	type UpdatePreferences = AuthenticatedRequest<{}, {}, Partial<SourceControlPreferences>, {}>;
	type SetReadOnly = AuthenticatedRequest<{}, {}, SourceControlSetReadOnly, {}>;
	type SetBranch = AuthenticatedRequest<{}, {}, SourceControlSetBranch, {}>;
	type Commit = AuthenticatedRequest<{}, {}, SourceControlCommit, {}>;
	type Stage = AuthenticatedRequest<{}, {}, SourceControlStage, {}>;
	type Push = AuthenticatedRequest<{}, {}, SourceControlPush, {}>;
	type Disconnect = AuthenticatedRequest<{}, {}, SourceControlDisconnect, {}>;
	type GetStatus = AuthenticatedRequest<{}, {}, {}, SourceControlGetStatus>;
	type GenerateKeyPair = AuthenticatedRequest<{}, {}, SourceControlGenerateKeyPair, {}>;
}
