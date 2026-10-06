import { McpDiscoveryVisitRequestDto } from '../mcp-discovery';

describe('McpDiscoveryVisitRequestDto', () => {
	it.each([true, false, undefined])('accepts a Claude choice of %s', (pickedClaude) => {
		expect(McpDiscoveryVisitRequestDto.safeParse({ pickedClaude }).success).toBe(true);
	});

	it.each(['true', 'false', null, 1, ['Claude']])(
		'rejects an invalid choice: %s',
		(pickedClaude) => {
			expect(McpDiscoveryVisitRequestDto.safeParse({ pickedClaude }).success).toBe(false);
		},
	);

	it('does not accept role or assignment values from the client', () => {
		expect(
			McpDiscoveryVisitRequestDto.parse({
				pickedClaude: true,
				role: 'global:owner',
				assignment: { variant: 'variant' },
			}),
		).toEqual({ pickedClaude: true });
	});
});
