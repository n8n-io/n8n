import type { AuthenticatedRequest } from '@/requests';
import type { SourceControlPreferences } from './sourceControlPreferences';
import type { SourceControlSetBranch } from './sourceControlSetBranch';
import type { SourceControlCommit } from './sourceControlCommit';
import type { SourceControlStage } from './sourceControlStage';
import type { SourceControlPush } from './sourceControlPush';
import type { SourceControlPushWorkFolder } from './sourceControlPushWorkFolder';
import type { SourceControlPullWorkFolder } from './sourceControlPullWorkFolder';
import type { SourceControlDisconnect } from './sourceControlDisconnect';
import type { SourceControlSetReadOnly } from './sourceControlSetReadOnly';
import type { SourceControlGetStatus } from './sourceControlGetStatus';
import type { SourceControlGenerateKeyPair } from './sourceControlGenerateKeyPair';

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
