/**
 * Supabase Vector Store Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcVectorStoreSupabaseV13Node } from './v13';
import type { LcVectorStoreSupabaseV12Node } from './v12';
import type { LcVectorStoreSupabaseV11Node } from './v11';
import type { LcVectorStoreSupabaseV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcVectorStoreSupabaseNode = LcVectorStoreSupabaseV13Node | LcVectorStoreSupabaseV12Node | LcVectorStoreSupabaseV11Node | LcVectorStoreSupabaseV1Node;