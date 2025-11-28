import type { AuthenticatedRequest } from '@n8n/db';

import type { SourceControlCommit } from '../../../modules/source-control.ee/types/source-control-commit';
import type { SourceControlDisconnect } from '../../../modules/source-control.ee/types/source-control-disconnect';
import type { SourceControlGenerateKeyPair } from '../../../modules/source-control.ee/types/source-control-generate-key-pair';
import type { SourceControlGetStatus } from '../../../modules/source-control.ee/types/source-control-get-status';
import type { SourceControlPreferences } from '../../../modules/source-control.ee/types/source-control-preferences';
import type { SourceControlPush } from '../../../modules/source-control.ee/types/source-control-push';
import type { SourceControlSetBranch } from '../../../modules/source-control.ee/types/source-control-set-branch';
import type { SourceControlSetReadOnly } from '../../../modules/source-control.ee/types/source-control-set-read-only';
import type { SourceControlStage } from '../../../modules/source-control.ee/types/source-control-stage';

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
