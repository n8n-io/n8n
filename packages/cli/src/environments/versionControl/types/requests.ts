import type { AuthenticatedRequest } from '@/requests';
import type { VersionControlPreferences } from './versionControlPreferences';
import type { VersionControlSetBranch } from './versionControlSetBranch';
import type { VersionControlCommit } from './versionControlCommit';
import type { VersionControlStage } from './versionControlStage';
import type { VersionControlPush } from './versionControlPush';

export declare namespace VersionControlRequest {
	type UpdatePreferences = AuthenticatedRequest<{}, {}, Partial<VersionControlPreferences>, {}>;
	type SetBranch = AuthenticatedRequest<{}, {}, VersionControlSetBranch, {}>;
	type Commit = AuthenticatedRequest<{}, {}, VersionControlCommit, {}>;
	type Stage = AuthenticatedRequest<{}, {}, VersionControlStage, {}>;
	type Push = AuthenticatedRequest<{}, {}, VersionControlPush, {}>;
}
