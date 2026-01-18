/**
 * AI Agent Tool Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcAgentToolV3Node } from './v3';
import type { LcAgentToolV22Node } from './v22';

export * from './v3';
export * from './v22';

// Combined union type for all versions
export type LcAgentToolNode = LcAgentToolV3Node | LcAgentToolV22Node;