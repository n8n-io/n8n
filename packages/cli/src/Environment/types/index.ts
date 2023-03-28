import type { AuthenticatedRequest } from '@/requests';

export interface EnvironmentInit {
	email: string;
	name: string;
	remoteRepository: string;
}

export interface EnvironmentPush {
	message: string;
}

export interface EnvironmentSetBranch {
	branch: string;
}

export declare namespace EnvironmentConfiguration {
	type InitSsh = AuthenticatedRequest<{}, {}, EnvironmentInit, {}>;
	type InitRepository = AuthenticatedRequest<{}, {}, {}, {}>;
	type Push = AuthenticatedRequest<{}, {}, EnvironmentPush, {}>;
	type Pull = AuthenticatedRequest<{}, {}, {}, {}>;
	type SetBranch = AuthenticatedRequest<{}, {}, EnvironmentSetBranch, {}>;
}
