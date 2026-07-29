import { decideMatchedFolder, prunesUnpackagedWorkflows } from '../folder-conflict-policy';

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

describe('prunesUnpackagedWorkflows', () => {
	it('prunes only under overwrite', () => {
		expect(prunesUnpackagedWorkflows('overwrite')).toBe(true);
		expect(prunesUnpackagedWorkflows('merge')).toBe(false);
		expect(prunesUnpackagedWorkflows('fail')).toBe(false);
	});
});
