/**
 * Notion Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { NotionV22Node } from './v22';
import type { NotionV21Node } from './v21';
import type { NotionV2Node } from './v2';
import type { NotionV1Node } from './v1';

export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type NotionNode = NotionV22Node | NotionV21Node | NotionV2Node | NotionV1Node;