import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed } from 'vue';

/**
 * Display names of node and credential types. The types live in the shell, so the module reads
 * them through the `typeDescriptions` capability. Each name falls back to the type name.
 */
export function useTypeNames() {
	const types = capabilityRegistry.use(capabilities.typeDescriptions);

	const nodeTypesByName = computed(() => {
		const byName = new Map<string, INodeTypeDescription>();
		for (const description of types.nodeTypes()) byName.set(description.name, description);
		return byName;
	});

	/** Loads the types. A failed load is not an error here: the names fall back to the types. */
	async function load() {
		try {
			await types.load();
		} catch {
			// The type names stay readable without the display names.
		}
	}

	const nodeDisplayName = (nodeType: string) =>
		nodeTypesByName.value.get(nodeType)?.displayName ?? nodeType;

	const credentialDisplayName = (credentialType: string) =>
		types.credentialTypeDisplayName(credentialType) ?? credentialType;

	/** The node types of `candidates` that use the credential type. */
	const nodeTypesWithCredential = (credentialType: string, candidates: string[]) =>
		candidates.filter((nodeType) =>
			nodeTypesByName.value
				.get(nodeType)
				?.credentials?.some((credential) => credential.name === credentialType),
		);

	return { load, nodeDisplayName, credentialDisplayName, nodeTypesWithCredential };
}
