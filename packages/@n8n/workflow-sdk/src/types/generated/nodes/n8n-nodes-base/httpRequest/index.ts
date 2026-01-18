/**
 * HTTP Request Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { HttpRequestV43Node } from './v43';
import type { HttpRequestV42Node } from './v42';
import type { HttpRequestV41Node } from './v41';
import type { HttpRequestV4Node } from './v4';
import type { HttpRequestV3Node } from './v3';
import type { HttpRequestV2Node } from './v2';
import type { HttpRequestV1Node } from './v1';

export * from './v43';
export * from './v42';
export * from './v41';
export * from './v4';
export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type HttpRequestNode = HttpRequestV43Node | HttpRequestV42Node | HttpRequestV41Node | HttpRequestV4Node | HttpRequestV3Node | HttpRequestV2Node | HttpRequestV1Node;