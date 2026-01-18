/**
 * Todoist Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { TodoistV22Node } from './v22';
import type { TodoistV21Node } from './v21';
import type { TodoistV2Node } from './v2';
import type { TodoistV1Node } from './v1';

export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type TodoistNode = TodoistV22Node | TodoistV21Node | TodoistV2Node | TodoistV1Node;