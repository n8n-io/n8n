import {
	getVertexEndpoint,
	getVertexHost,
	isValidVertexLocation,
	resolveVertexLocation,
} from '../vertex-location';

describe('getVertexEndpoint', () => {
	it('returns the .rep. host for the EU multi-region location', () => {
		expect(getVertexEndpoint('eu')).toBe('aiplatform.eu.rep.googleapis.com');
	});

	it('returns the .rep. host for the US multi-region location', () => {
		expect(getVertexEndpoint('us')).toBe('aiplatform.us.rep.googleapis.com');
	});

	it('returns undefined for global so the SDK derives aiplatform.googleapis.com', () => {
		expect(getVertexEndpoint('global')).toBeUndefined();
	});

	it('returns undefined for a regional location so the SDK derives <region>-aiplatform...', () => {
		expect(getVertexEndpoint('europe-west4')).toBeUndefined();
		expect(getVertexEndpoint('us-central1')).toBeUndefined();
	});
});

describe('resolveVertexLocation', () => {
	it('prefers the node-level override over the credential region', () => {
		expect(resolveVertexLocation('global', 'us-central1')).toBe('global');
		expect(resolveVertexLocation('eu', 'us-central1')).toBe('eu');
	});

	it('falls back to the credential region when no override is set', () => {
		expect(resolveVertexLocation('', 'us-central1')).toBe('us-central1');
		expect(resolveVertexLocation(undefined, 'europe-west4')).toBe('europe-west4');
	});
});

describe('isValidVertexLocation', () => {
	it.each(['global', 'eu', 'us', 'us-central1', 'europe-west4', 'northamerica-northeast1'])(
		'accepts the region %j',
		(location) => {
			expect(isValidVertexLocation(location)).toBe(true);
		},
	);

	// The location is interpolated into the request authority, so anything that
	// can end or re-point the host has to be refused.
	it.each([
		'elsewhere.example/',
		'evil.example',
		'us-central1:8443',
		'user@evil.example',
		'us-central1/../..',
		'US-CENTRAL1',
		'us central1',
		'',
	])('rejects the region %j', (location) => {
		expect(isValidVertexLocation(location)).toBe(false);
	});
});

describe('getVertexHost', () => {
	// Mirrors GoogleHostConnection.endpoint in @langchain/google-common: an
	// explicit endpoint wins, global has no region prefix, everything else does.
	it.each([
		['global', 'aiplatform.googleapis.com'],
		['eu', 'aiplatform.eu.rep.googleapis.com'],
		['us', 'aiplatform.us.rep.googleapis.com'],
		['us-central1', 'us-central1-aiplatform.googleapis.com'],
		['europe-west4', 'europe-west4-aiplatform.googleapis.com'],
	])('resolves %j to %j', (location, expected) => {
		expect(getVertexHost(location)).toBe(expected);
	});
});
