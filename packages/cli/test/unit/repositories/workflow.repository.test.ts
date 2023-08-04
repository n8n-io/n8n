import { WorkflowRepository } from '@/databases/repositories';

describe('toQueryFilter()', () => {
	describe('should return a query filter', () => {
		test('handle arg-less call', () => {
			const filter = WorkflowRepository.toQueryFilter();
			expect(filter).toEqual({});
		});

		test('parse valid filter', () => {
			const filter = WorkflowRepository.toQueryFilter('{"name":"My Workflow", "active":true}');
			expect(filter).toEqual({ name: 'My Workflow', active: true });
		});

		test('ignore invalid filter', () => {
			const filter = WorkflowRepository.toQueryFilter('{"name":"My Workflow","foo":"bar"}');
			expect(filter).toEqual({ name: 'My Workflow' });
		});

		test('throw on invalid JSON', () => {
			const call = () => WorkflowRepository.toQueryFilter('{"name":"My Workflow"');
			expect(call).toThrowError('Failed to parse JSON into filter object');
		});

		test('throw on non-object JSON for filter', () => {
			const call = () => WorkflowRepository.toQueryFilter('"My Workflow"');
			expect(call).toThrowError('Parsed filter is not an object');
		});
	});
});

describe('toQuerySelect()', () => {
	describe('should return a query select', () => {
		test('parse valid select', () => {
			const select = WorkflowRepository.toQuerySelect('["name", "id"]');
			expect(select).toEqual({ name: true, id: true });
		});

		test('ignore invalid select', () => {
			const select = WorkflowRepository.toQuerySelect('["name", "foo"]');
			expect(select).toEqual({ name: true });
		});

		test('throw on invalid JSON', () => {
			const call = () => WorkflowRepository.toQuerySelect('["name"');
			expect(call).toThrowError('Failed to parse JSON into select array');
		});

		test('throw on non-array JSON for select', () => {
			const call = () => WorkflowRepository.toQuerySelect('"name"');
			expect(call).toThrowError('Parsed select is not an array');
		});
	});
});
