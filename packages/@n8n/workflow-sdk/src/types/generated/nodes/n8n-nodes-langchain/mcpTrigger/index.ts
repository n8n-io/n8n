/**
 * MCP Server Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcMcpTriggerV2Node } from './v2';
import type { LcMcpTriggerV11Node } from './v11';
import type { LcMcpTriggerV1Node } from './v1';

export * from './v2';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcMcpTriggerNode = LcMcpTriggerV2Node | LcMcpTriggerV11Node | LcMcpTriggerV1Node;