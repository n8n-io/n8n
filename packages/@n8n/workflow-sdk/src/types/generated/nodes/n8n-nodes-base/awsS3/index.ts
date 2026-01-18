/**
 * AWS S3 Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { AwsS3V2Node } from './v2';
import type { AwsS3V1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type AwsS3Node = AwsS3V2Node | AwsS3V1Node;