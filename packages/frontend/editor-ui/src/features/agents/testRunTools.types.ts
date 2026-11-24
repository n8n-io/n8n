import type { ToolTestCapability, ToolTestKind, ToolTestability } from '@n8n/api-types';

export type { ToolTestCapability, ToolTestKind, ToolTestability };

/** Why a tool is blocked. */
export type BlockedReason = Extract<ToolTestCapability, { testability: 'blocked' }>['reason'];
