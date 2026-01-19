/**
 * Jira Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { JiraTriggerV11Node } from './v11';
import type { JiraTriggerV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type JiraTriggerNode = JiraTriggerV11Node | JiraTriggerV1Node;