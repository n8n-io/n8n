/**
 * Google Calendar Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GoogleCalendarV13Node } from './v13';
import type { GoogleCalendarV12Node } from './v12';
import type { GoogleCalendarV11Node } from './v11';
import type { GoogleCalendarV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type GoogleCalendarNode = GoogleCalendarV13Node | GoogleCalendarV12Node | GoogleCalendarV11Node | GoogleCalendarV1Node;