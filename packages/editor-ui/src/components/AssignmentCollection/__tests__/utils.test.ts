import { nameFromExpression } from '../utils';

describe('AssignmentCollection > utils', () => {
	describe('nameFromExpression', () => {
		test('should extract assignment name from previous node', () => {
			expect(nameFromExpression('{{ $json.foo.bar }}')).toBe('foo.bar');
		});

		test('should extract assignment name from another node', () => {
			expect(nameFromExpression("{{ $('Node's \"Name\" (copy)').item.json.foo.bar }}")).toBe(
				'foo.bar',
			);
		});
	});
});
