import { resolveBuilderThreadId } from '../agents-builder.service';

describe('resolveBuilderThreadId', () => {
	it('defaults to the builder thread prefix', () => {
		expect(resolveBuilderThreadId('agent-1')).toBe('builder:agent-1');
	});

	it('uses the override when provided', () => {
		expect(resolveBuilderThreadId('agent-1', 'ia-builder:thread-9:agent-1')).toBe(
			'ia-builder:thread-9:agent-1',
		);
	});
});
