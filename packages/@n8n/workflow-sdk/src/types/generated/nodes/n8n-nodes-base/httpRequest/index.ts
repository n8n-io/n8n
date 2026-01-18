/**
 * HTTP Request Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { HttpRequestV43Node } from './v43';
import type { HttpRequestV2Node } from './v2';
import type { HttpRequestV1Node } from './v1';

export * from './v43';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type HttpRequestNode = HttpRequestV43Node | HttpRequestV2Node | HttpRequestV1Node;