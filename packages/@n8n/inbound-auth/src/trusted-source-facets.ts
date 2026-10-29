import {
	SurfaceIdSchema,
	type SurfaceId,
	type TrustedSourceConfigLatest,
} from './trusted-source-config';

export type TrustedSourceFacets = {
	discoveryMode: TrustedSourceConfigLatest['authentication']['discovery']['mode'];
	clientKind: 'registered' | 'virtual' | null;
	surfaces: SurfaceId[];
	identitySubject: TrustedSourceConfigLatest['identity']['subject'];
	linkByEmail: TrustedSourceConfigLatest['identity']['linkByEmail'];
	provisionHuman: TrustedSourceConfigLatest['identity']['provision']['human'];
	roleMappingMode: TrustedSourceConfigLatest['identity']['roleMapping']['mode'];
};

export type TrustedSourceTelemetryFacets = {
	discovery_mode: TrustedSourceConfigLatest['authentication']['discovery']['mode'];
	client_kind: 'registered' | 'virtual' | null;
	surfaces: SurfaceId[];
	identity_subject: TrustedSourceConfigLatest['identity']['subject'];
	link_by_email: TrustedSourceConfigLatest['identity']['linkByEmail'];
	provision_human: TrustedSourceConfigLatest['identity']['provision']['human'];
	role_mapping_mode: TrustedSourceConfigLatest['identity']['roleMapping']['mode'];
};

export function toTrustedSourceTelemetryFacets(
	facets: TrustedSourceFacets,
): TrustedSourceTelemetryFacets {
	return {
		discovery_mode: facets.discoveryMode,
		client_kind: facets.clientKind,
		surfaces: facets.surfaces,
		identity_subject: facets.identitySubject,
		link_by_email: facets.linkByEmail,
		provision_human: facets.provisionHuman,
		role_mapping_mode: facets.roleMappingMode,
	};
}

export function trustedSourceFacetsOf(config: TrustedSourceConfigLatest): TrustedSourceFacets {
	const { authentication, identity, surfaces } = config;

	return {
		discoveryMode: authentication.discovery.mode,
		clientKind: authentication.client?.kind ?? null,
		surfaces: SurfaceIdSchema.options.filter((surface) => surfaces[surface] !== undefined),
		identitySubject: identity.subject,
		linkByEmail: identity.linkByEmail,
		provisionHuman: identity.provision.human,
		roleMappingMode: identity.roleMapping.mode,
	};
}
