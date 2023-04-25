import type { AuthenticatedRequest } from '@/requests';
import type { VersionControlPreferences } from './versionControlPreferences';
import type { VersionControlSetBranch } from './versionControlSetBranch';

export declare namespace VersionControlRequest {
	type UpdatePreferences = AuthenticatedRequest<{}, {}, Partial<VersionControlPreferences>, {}>;
	type SetBranch = AuthenticatedRequest<{}, {}, VersionControlSetBranch, {}>;
}
