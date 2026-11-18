import { toReferenceRows } from '../page-references';

describe('toReferenceRows', () => {
	it('should keep the workflow id of a node reference as the parent', () => {
		expect(toReferenceRows('[Node](/workflow/wf1/node1)')).toEqual([
			{ resourceType: 'node', resourceId: 'node1', parentResourceId: 'wf1' },
		]);
	});

	it('should set no parent on a reference that is not a node', () => {
		expect(toReferenceRows('[Sync](/workflow/wf1)')).toEqual([
			{ resourceType: 'workflow', resourceId: 'wf1', parentResourceId: null },
		]);
	});

	it('should return one row for a resource that the content links twice', () => {
		expect(toReferenceRows('[a](/workflow/wf1) and [b](/workflow/wf1)')).toHaveLength(1);
	});

	it('should ignore a link to another host', () => {
		expect(toReferenceRows('[n8n](https://n8n.io/workflow/wf1)')).toEqual([]);
	});

	it('should drop a reference with an id that is longer than the column', () => {
		expect(toReferenceRows(`[long](/workflow/${'a'.repeat(256)})`)).toEqual([]);
	});
});
