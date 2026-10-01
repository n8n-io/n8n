import type { ProjectPlannedAction } from './project-import.types';
import type { ProjectConflictPolicy } from '../../n8n-packages.types';

/**
 * A conflict policy's verdict for one matched project. `blocked` aborts the import and is set
 * only by the `fail` policy; `action` decides the matched project's own details. Its contents
 * merge in either way.
 */
export interface MatchedProjectDecision {
	action: Extract<ProjectPlannedAction, 'update' | 'skip'>;
	blocked: boolean;
}

const PROJECT_CONFLICT_POLICIES: Record<ProjectConflictPolicy, MatchedProjectDecision> = {
	merge: { action: 'skip', blocked: false },
	fail: { action: 'skip', blocked: true },
	overwrite: { action: 'update', blocked: false },
};

export function decideMatchedProject(policy: ProjectConflictPolicy): MatchedProjectDecision {
	return PROJECT_CONFLICT_POLICIES[policy];
}
