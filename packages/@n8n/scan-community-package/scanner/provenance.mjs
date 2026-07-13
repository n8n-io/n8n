const NPM_PROVENANCE_PREDICATE_TYPE = 'https://slsa.dev/provenance/v1';
const N8N_COMMUNITY_NODE_PUBLISH_DOCS_URL =
	'https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/';

export const checkPackageProvenance = (packageMetadata, version) => {
	const packageVersion = packageMetadata.versions?.[version];
	const provenance = packageVersion?.dist?.attestations?.provenance;

	if (!packageVersion) {
		return {
			passed: false,
			message: `No package metadata found for version ${version}`,
		};
	}

	if (!provenance) {
		return {
			passed: false,
			message: `Package was not published with npm provenance. Learn how to publish community nodes with provenance: ${N8N_COMMUNITY_NODE_PUBLISH_DOCS_URL}`,
		};
	}

	if (provenance.predicateType !== NPM_PROVENANCE_PREDICATE_TYPE) {
		return {
			passed: false,
			message: `Unsupported npm provenance predicate type: ${provenance.predicateType ?? 'unknown'}`,
		};
	}

	return { passed: true };
};
