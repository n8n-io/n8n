/**
 * Microsoft Excel 365 Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { MicrosoftExcelV22Node } from './v22';
import type { MicrosoftExcelV1Node } from './v1';

export * from './v22';
export * from './v1';

// Combined union type for all versions
export type MicrosoftExcelNode = MicrosoftExcelV22Node | MicrosoftExcelV1Node;