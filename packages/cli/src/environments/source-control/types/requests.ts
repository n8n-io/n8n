import type { AuthenticatedRequest } from '@/requests';

import type { SourceControlCommit } from './source-control-commit';
import type { SourceControlDisconnect } from './source-control-disconnect';
import type { SourceControlGenerateKeyPair } from './source-control-generate-key-pair';
import type { SourceControlGetStatus } from './source-control-get-status';
import type { SourceControlPreferences } from './source-control-preferences';
import type { SourceControlPullWorkFolder } from './source-control-pull-work-folder';
import type { SourceControlPush } from './source-control-push';
import type { SourceControlPushWorkFolder } from './source-control-push-work-folder';
import type { SourceControlSetBranch } from './source-control-set-branch';
import type { SourceControlSetReadOnly } from './source-control-set-read-only';
import type { SourceControlStage } from './source-control-stage';

export declare namespace SourceControlRequest {
	type UpdatePreferences = AuthenticatedRequest<{}, {}, Partial<SourceControlPreferences>, {}>;
	type SetReadOnly = AuthenticatedRequest<{}, {}, SourceControlSetReadOnly, {}>;
	type SetBranch = AuthenticatedRequest<{}, {}, SourceControlSetBranch, {}>;
	type Commit = AuthenticatedRequest<{}, {}, SourceControlCommit, {}>;
	type Stage = AuthenticatedRequest<{}, {}, SourceControlStage, {}>;
	type Push = AuthenticatedRequest<{}, {}, SourceControlPush, {}>;
	type Disconnect = AuthenticatedRequest<{}, {}, SourceControlDisconnect, {}>;
	type PushWorkFolder = AuthenticatedRequest<{}, {}, SourceControlPushWorkFolder, {}>;
	type PullWorkFolder = AuthenticatedRequest<{}, {}, SourceControlPullWorkFolder, {}>;
	type GetStatus = AuthenticatedRequest<{}, {}, {}, SourceControlGetStatus>;
	type GenerateKeyPair = AuthenticatedRequest<{}, {}, SourceControlGenerateKeyPair, {}>;
}
