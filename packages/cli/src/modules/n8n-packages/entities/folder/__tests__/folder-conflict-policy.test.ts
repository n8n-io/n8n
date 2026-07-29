import { decideMatchedFolder, removesUnpackagedWorkflows } from '../folder-conflict-policy';

describe('decideMatchedFolder', () => {
	it('does not block under merge', () => {
		expect(decideMatchedFolder('merge')).toEqual({ blocked: false });
	});

	it('blocks under fail', () => {
		expect(decideMatchedFolder('fail')).toEqual({ blocked: true });
	});

	it('does not block under overwrite, which reuses matched folders like merge', () => {
		expect(decideMatchedFolder('overwrite')).toEqual({ blocked: false });
	});
});

describe('removesUnpackagedWorkflows', () => {
	it('prunes only under overwrite', () => {
		expect(removesUnpackagedWorkflows('overwrite')).toBe(true);
		expect(removesUnpackagedWorkflows('merge')).toBe(false);
		expect(removesUnpackagedWorkflows('fail')).toBe(false);
	});
});
