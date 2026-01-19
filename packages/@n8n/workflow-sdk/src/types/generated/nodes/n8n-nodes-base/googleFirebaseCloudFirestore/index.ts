/**
 * Google Cloud Firestore Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GoogleFirebaseCloudFirestoreV11Node } from './v11';
import type { GoogleFirebaseCloudFirestoreV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type GoogleFirebaseCloudFirestoreNode = GoogleFirebaseCloudFirestoreV11Node | GoogleFirebaseCloudFirestoreV1Node;