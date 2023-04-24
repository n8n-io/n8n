import type { AuthenticatedRequest } from '@/requests';
import type { VersionControlPreferences } from './versionControlPreferences';

export declare namespace VersionControlRequest {
	type GetPreferences = AuthenticatedRequest<{}, VersionControlPreferences, {}, {}>;
	type UpdatePreferences = AuthenticatedRequest<{}, {}, Partial<VersionControlPreferences>, {}>;
}
