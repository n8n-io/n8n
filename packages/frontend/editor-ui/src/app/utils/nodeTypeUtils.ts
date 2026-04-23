import type { INodeUi } from '@/Interface';

/**
 * True when the node uses the HTTP-request proxy-auth pattern
 * (parameter key `nodeCredentialType` is present).
 */
export function hasProxyAuth(node: INodeUi): boolean {
	return Object.keys(node.parameters).includes('nodeCredentialType');
}
