/**
 * Vercel AI Gateway Chat Model Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcLmChatVercelAiGatewayV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type LcLmChatVercelAiGatewayNode = LcLmChatVercelAiGatewayV1Node;