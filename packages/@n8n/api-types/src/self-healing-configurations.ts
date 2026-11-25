import { z } from 'zod';

import type { ProjectIcon } from './schemas/project.schema';
import { Z } from './zod-class';

export class UpdateSelfHealingConfigurationDto extends Z.class({
	scope: z.enum(['all', 'selected']),
	workflowIds: z.array(z.string().min(1).max(36)).default([]),
	reviewerIds: z.array(z.string().uuid()).default([]),
	includeAllProjectMembers: z.boolean().default(false),
	includeSubWorkflows: z.boolean().default(false),
}) {}

export class SaveSelfHealingConfigurationDto extends UpdateSelfHealingConfigurationDto.extend({
	enabled: z.boolean().default(false),
}) {}

export class SetSelfHealingConfigurationEnabledDto extends Z.class({
	enabled: z.boolean(),
}) {}

export type SelfHealingConfigurationDto = SaveSelfHealingConfigurationDto & {
	id: number;
	projectId: string;
	enabledById: string | null;
	lastActivity: string | null;
};

export type SelfHealingConfigurationOptions = {
	project: { name: string; icon: ProjectIcon | null };
	workflows: Array<{ id: string; name: string }>;
	reviewers: Array<{
		id: string;
		email: string;
		firstName: string | null;
		lastName: string | null;
	}>;
};

/** Instance flag that turns self-healing off on Cloud without a deployment. */
export const SELF_HEALING_FLAG = '150_self_healing';

export type SelfHealingStatusDto = {
	/** False when self-healing is off on this instance. Existing results stay available. */
	enabled: boolean;
	/** True when a configuration sends its results to the current user. */
	isReviewer: boolean;
	/** The user's personal project, where the user can always add a configuration. */
	setupProjectId: string | null;
};
