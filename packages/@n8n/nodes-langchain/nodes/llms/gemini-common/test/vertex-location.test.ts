import { getVertexEndpoint, resolveVertexLocation } from '../vertex-location';

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
