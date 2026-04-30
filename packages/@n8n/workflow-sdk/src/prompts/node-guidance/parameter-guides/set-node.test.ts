import { SET_NODE_GUIDE } from './set-node';

describe('SET_NODE_GUIDE', () => {
	it('documents the canonical manual Set v3.4 assignment shape', () => {
		expect(SET_NODE_GUIDE.content).toContain('mode: "manual"');
		expect(SET_NODE_GUIDE.content).toContain('includeOtherFields');
		expect(SET_NODE_GUIDE.content).toContain('assignments: {');
		expect(SET_NODE_GUIDE.content).toContain('id: "caption"');
	});

	it('warns against using keepAllExistingFields as a mode', () => {
		expect(SET_NODE_GUIDE.content).toContain('keepAllExistingFields');
	});
});
