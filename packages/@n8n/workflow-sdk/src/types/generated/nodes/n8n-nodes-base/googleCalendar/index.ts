/**
 * Google Calendar Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { GoogleCalendarV13Node } from './v13';

export * from './v13';

// Combined union type for all versions
export type GoogleCalendarNode = GoogleCalendarV13Node;