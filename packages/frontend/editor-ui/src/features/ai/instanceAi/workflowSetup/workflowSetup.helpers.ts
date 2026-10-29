/** Stable section identity used as the key everywhere section state is tracked. */
export function buildSectionId(targetNodeName: string, credentialType?: string): string {
	return `${targetNodeName}:${credentialType ?? 'parameters'}`;
}
