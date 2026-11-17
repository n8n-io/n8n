import { mockNode, type NodeReference } from '../src';

function mockEachForm(node: NodeReference) {
	mockNode(node, [{ id: 42 }]);
	mockNode(node, { outputs: [[], [{ id: 42 }]] });
	mockNode(node, { error: { message: 'CRM is unavailable' } });
	mockNode(node, (items) => [{ count: items.length }]);
	mockNode(node, async (items) => [{ count: items.length }]);
	mockNode(node, { each: (item) => [{ price: Number(item.id) * 2 }] });
	mockNode(node, vi.fn());
	mockNode(
		node,
		vi
			.fn()
			.mockReturnValueOnce([{ id: 1 }])
			.mockReturnValueOnce([{ id: 3 }]),
	);
	mockNode(
		node,
		vi
			.fn()
			.mockRejectedValueOnce(new Error('CRM is unavailable'))
			.mockResolvedValue([{ id: 42 }]),
	);
	mockNode(node, { each: vi.fn() });
}

test('accepts each mock form of the spec', () => {
	expectTypeOf(mockEachForm).toBeFunction();
});
