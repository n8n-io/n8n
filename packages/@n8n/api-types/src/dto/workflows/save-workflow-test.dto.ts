import { z } from 'zod';

import { Z } from '../../zod-class';

/** The size limit keeps one test file from filling the database row. */
export const WORKFLOW_TEST_SOURCE_MAX_LENGTH = 500_000;

export class SaveWorkflowTestDto extends Z.class({
	source: z.string().max(WORKFLOW_TEST_SOURCE_MAX_LENGTH),
}) {}

export class RunStoredWorkflowTestDto extends Z.class({
	version: z.enum(['draft', 'published']).default('draft'),
}) {}
