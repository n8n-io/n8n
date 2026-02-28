import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * DTO for self-service user settings updates via /me/settings endpoint.
 * This DTO only includes fields that users should be able to modify themselves.
 *
 * Excluded fields:
 * - `allowSSOManualLogin`: Admin-only, prevents SSO bypass attacks
 * - `userActivated`: Set by backend when user runs first successful workflow
 *
 * For admin operations on user settings, use `SettingsUpdateRequestDto` instead.
 */
export class UserSelfSettingsUpdateRequestDto extends Z.class({
	easyAIWorkflowOnboarded: z.boolean().optional(),
	dismissedCallouts: z.record(z.string(), z.boolean()).optional(),
}) {}
