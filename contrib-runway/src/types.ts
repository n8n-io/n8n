export interface Ticket {
	id: string;
	simulation: boolean;
	status: string;
	type: string;
	area: string;
	allowed_read_paths?: string[];
	allowed_write_paths?: string[];
	problem?: string;
	desired_outcome?: string;
	acceptance_criteria?: string[];
}

export interface Policy {
	allowed_change: {
		requires_approval: boolean;
		maximum_scope: number;
	};
	restricted_areas: string[];
	bug_fix_requirements: string[];
	forbidden_code_patterns?: string[];
	preferred_patterns?: Record<string, string>;
}

export type CheckStatus = 'BLOCKED' | 'READY';

export interface CheckResult {
	ticketId: string;
	approved: boolean;
	areaRestricted: boolean;
	requiredTests: string[];
	allowedReadPaths: string[];
	allowedWritePaths: string[];
	status: CheckStatus;
	blockReasons: string[];
}
