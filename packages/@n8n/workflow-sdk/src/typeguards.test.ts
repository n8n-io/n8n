import { isWorkflowBuilder, isWorkflowJSON } from './typeguards';

describe('isWorkflowBuilder', () => {
	it('should return true for an object with regenerateNodeIds function', () => {
		const builder = { regenerateNodeIds: () => {} };
		expect(isWorkflowBuilder(builder)).toBe(true);
	});

	it('should return false for null', () => {
		expect(isWorkflowBuilder(null)).toBe(false);
	});

	it('should return false for undefined', () => {
		expect(isWorkflowBuilder(undefined)).toBe(false);
	});

	it('should return false for a string', () => {
		expect(isWorkflowBuilder('workflow')).toBe(false);
	});

	it('should return false for an object without regenerateNodeIds', () => {
		expect(isWorkflowBuilder({ nodes: [] })).toBe(false);
	});

	it('should return false when regenerateNodeIds is not a function', () => {
		expect(isWorkflowBuilder({ regenerateNodeIds: 'not-a-function' })).toBe(false);
	});
});

describe('isWorkflowJSON', () => {
	it('should return true for an object with a nodes array', () => {
		expect(isWorkflowJSON({ nodes: [] })).toBe(true);
	});

	it('should return true for a full WorkflowJSON-like object', () => {
		expect(isWorkflowJSON({ name: 'Test', nodes: [{ id: '1' }], connections: {} })).toBe(true);
	});

	it('should return false for null', () => {
		expect(isWorkflowJSON(null)).toBe(false);
	});

	it('should return false for undefined', () => {
		expect(isWorkflowJSON(undefined)).toBe(false);
	});

	it('should return false for a string', () => {
		expect(isWorkflowJSON('workflow')).toBe(false);
	});

	it('should return false for an object without nodes', () => {
		expect(isWorkflowJSON({ name: 'Test' })).toBe(false);
	});

	it('should return false when nodes is not an array', () => {
		expect(isWorkflowJSON({ nodes: 'not-an-array' })).toBe(false);
	});
});
