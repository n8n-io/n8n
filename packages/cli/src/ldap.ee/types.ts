import type { LdapConfig } from '@n8n/constants';
import type { RunningMode } from '@n8n/db';

import type { AuthenticatedRequest } from '@/requests';

export declare namespace LdapConfiguration {
	type Update = AuthenticatedRequest<{}, {}, LdapConfig, {}>;
	type Sync = AuthenticatedRequest<{}, {}, { type: RunningMode }, {}>;
	type GetSync = AuthenticatedRequest<{}, {}, {}, { page?: string; perPage?: string }>;
}
