/**
 * MCP Client Tool Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcMcpClientToolV12Node } from './v12';

export * from './v12';

// Combined union type for all versions
export type LcMcpClientToolNode = LcMcpClientToolV12Node;