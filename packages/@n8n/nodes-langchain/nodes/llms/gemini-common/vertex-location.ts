import type { INodeProperties } from 'n8n-workflow';

// Vertex multi-region locations that guarantee data residency within a geography
// (e.g. for GDPR). Unlike `global` and individual regions, they are reached through a
// dedicated `.rep.` hostname instead of `<location>-aiplatform.googleapis.com`.
const MULTI_REGION_LOCATIONS = ['eu', 'us'];

/**
 * Returns the API host for a Vertex location, or `undefined` to let the SDK derive it.
 * Newer Gemini models (3.x) are only served from `global` or a multi-region location,
 * and the multi-region ones require the `.rep.` host the SDK doesn't build on its own.
 */
export function getVertexEndpoint(location: string): string | undefined {
	if (MULTI_REGION_LOCATIONS.includes(location)) {
		return `aiplatform.${location}.rep.googleapis.com`;
	}
	return undefined;
}

/**
 * Node-level location override wins over the region set in the credential.
 * An empty override (the field default) means "use the credential region".
 */
export function resolveVertexLocation(override: string | undefined, credentialRegion: string) {
	if (override) return override;
	return credentialRegion;
}

// Optional per-node override so the location for newer Gemini models is selectable
// right where the model is configured, not only in the shared credential.
export const vertexLocationField: INodeProperties = {
	displayName: 'Region',
	name: 'location',
	type: 'options',
	default: '',
	description:
		'Where the model runs. Newer Gemini models (3.x) are only available on the Global or the EU/US multi-region locations. Leave as Default to use the region set in the credential.',
	options: [
		{ name: 'Default (Use Credential Region)', value: '' },
		{ name: 'Global', value: 'global' },
		{ name: 'EU (Multi-Region)', value: 'eu' },
		{ name: 'US (Multi-Region)', value: 'us' },
	],
};
