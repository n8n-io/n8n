/**
 * Venafi TLS Protect Datacenter Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { VenafiTlsProtectDatacenterV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type VenafiTlsProtectDatacenterNode = VenafiTlsProtectDatacenterV1Node;