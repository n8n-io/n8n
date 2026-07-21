import { decideMatchedFolder } from '../folder-conflict-policy';

describe('decideMatchedFolder', () => {
	it('does not block under merge', () => {
		expect(decideMatchedFolder('merge')).toEqual({ blocked: false });
	});

	it('blocks under fail', () => {
		expect(decideMatchedFolder('fail')).toEqual({ blocked: true });
	});
});
