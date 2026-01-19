/**
 * Microsoft Excel 365 Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MicrosoftExcelV22Node } from './v22';
import type { MicrosoftExcelV21Node } from './v21';
import type { MicrosoftExcelV2Node } from './v2';
import type { MicrosoftExcelV1Node } from './v1';

export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type MicrosoftExcelNode = MicrosoftExcelV22Node | MicrosoftExcelV21Node | MicrosoftExcelV2Node | MicrosoftExcelV1Node;