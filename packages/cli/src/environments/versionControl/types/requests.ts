import type { AuthenticatedRequest } from '@/requests';
import type { VersionControlPreferences } from './versionControlPreferences';
import type { VersionControlSetBranch } from './versionControlSetBranch';
import type { VersionControlCommit } from './versionControlCommit';
import type { VersionControlStage } from './versionControlStage';
import type { VersionControlPush } from './versionControlPush';
import type { VersionControlPushWorkFolder } from './versionControlPushWorkFolder';
import type { VersionControlPullWorkFolder } from './versionControlPullWorkFolder';
import type { VersionControlDisconnect } from './versionControlDisconnect';
import type { VersionControlSetReadOnly } from './versionControlSetReadOnly';

export declare namespace VersionControlRequest {
	type UpdatePreferences = AuthenticatedRequest<{}, {}, Partial<VersionControlPreferences>, {}>;
	type SetReadOnly = AuthenticatedRequest<{}, {}, VersionControlSetReadOnly, {}>;
	type SetBranch = AuthenticatedRequest<{}, {}, VersionControlSetBranch, {}>;
	type Commit = AuthenticatedRequest<{}, {}, VersionControlCommit, {}>;
	type Stage = AuthenticatedRequest<{}, {}, VersionControlStage, {}>;
	type Push = AuthenticatedRequest<{}, {}, VersionControlPush, {}>;
	type Disconnect = AuthenticatedRequest<{}, {}, VersionControlDisconnect, {}>;
	type PushWorkFolder = AuthenticatedRequest<{}, {}, VersionControlPushWorkFolder, {}>;
	type PullWorkFolder = AuthenticatedRequest<{}, {}, VersionControlPullWorkFolder, {}>;
}
