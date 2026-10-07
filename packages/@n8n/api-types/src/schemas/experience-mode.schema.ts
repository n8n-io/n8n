import { z } from 'zod';

/**
 * The editor experience a user sees when experience modes are on.
 * - `simple`: chat first, with few controls.
 * - `power`: thread list, run targets and review panes.
 */
export const experienceModeSchema = z.enum(['simple', 'power']);

export type ExperienceMode = z.infer<typeof experienceModeSchema>;
