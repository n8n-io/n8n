import { decideMatchedProject } from '../project-conflict-policy';

describe('decideMatchedProject', () => {
	it('skips without blocking under merge', () => {
		expect(decideMatchedProject('merge')).toEqual({ action: 'skip', blocked: false });
	});

	it('blocks under fail', () => {
		expect(decideMatchedProject('fail')).toMatchObject({ blocked: true });
	});

	it('updates under overwrite', () => {
		expect(decideMatchedProject('overwrite')).toEqual({ action: 'update', blocked: false });
	});
});
