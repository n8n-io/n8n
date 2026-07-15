import axios from 'axios';

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

/**
 * Extracts the git source repository and attested commit from an npm
 * provenance attestation bundle.
 *
 * npm provenance (SLSA v1) bundles carry, in `predicate.buildDefinition
 * .resolvedDependencies`, a `git+https://...@<ref>` entry whose `digest
 * .gitCommit` pins the exact commit the published artifact was built from.
 * That commit is what the scanner must lint to run source-level rules
 * (filename conventions, node-description content) that no-op on compiled
 * `.d.ts`/`.js` output. Pure so tests can feed a fixture bundle directly.
 *
 * @returns {{ repoUrl: string, commitSha: string } | null}
 */
export const extractSourceLocationFromBundle = (bundle) => {
	const slsa = (bundle?.attestations ?? []).find(
		(a) => a.predicateType === NPM_PROVENANCE_PREDICATE_TYPE,
	);
	const payloadB64 = slsa?.bundle?.dsseEnvelope?.payload;
	if (!payloadB64) return null;

	let statement;
	try {
		statement = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
	} catch {
		return null;
	}

	const deps = statement?.predicate?.buildDefinition?.resolvedDependencies ?? [];
	for (const dep of deps) {
		const uri = dep?.uri ?? '';
		// `git+https://github.com/owner/repo@refs/heads/main` → repo URL + commit
		const match = uri.match(/^git\+(https?:\/\/.+?)(?:@.+)?$/);
		const commitSha = dep?.digest?.gitCommit;
		if (match && /^[0-9a-f]{7,40}$/.test(commitSha)) {
			return { repoUrl: match[1], commitSha };
		}
	}
	return null;
};

/**
 * Fetches the provenance attestation bundle for a published version and
 * resolves the source repository + attested commit to lint. Requires the
 * version to already have passed `checkPackageProvenance` (i.e. carry SLSA
 * provenance).
 */
export const getSourceLocation = async (packageMetadata, version) => {
	const attestationsUrl = packageMetadata?.versions?.[version]?.dist?.attestations?.url;
	if (!attestationsUrl) return null;

	const { data } = await axios.get(attestationsUrl);
	return extractSourceLocationFromBundle(data);
};
