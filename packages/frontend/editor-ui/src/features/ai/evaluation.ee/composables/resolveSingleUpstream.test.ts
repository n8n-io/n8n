import { describe, it, expect } from 'vitest';
import { resolveSingleUpstream } from './resolveSingleUpstream';

describe('resolveSingleUpstream', () => {
	it('returns the sole parent when it is not an Evaluation Trigger', () => {
		const result = resolveSingleUpstream(['Manual Trigger'], new Set());
		expect(result).toBe('Manual Trigger');
	});

	it('returns the Evaluation Trigger when it is the only parent (TRUST-407)', () => {
		const result = resolveSingleUpstream(['Eval Trigger'], new Set(['Eval Trigger']));
		expect(result).toBe('Eval Trigger');
	});

	it('prefers the real trigger when a pre-existing Evaluation Trigger converges on the same node', () => {
		const result = resolveSingleUpstream(
			['Eval Trigger', 'Manual Trigger'],
			new Set(['Eval Trigger']),
		);
		expect(result).toBe('Manual Trigger');
	});

	it('is order-independent when the Evaluation Trigger converges alongside the real one', () => {
		const result = resolveSingleUpstream(
			['Manual Trigger', 'Eval Trigger'],
			new Set(['Eval Trigger']),
		);
		expect(result).toBe('Manual Trigger');
	});

	it('returns undefined when two non-evaluation nodes both feed the same point', () => {
		const result = resolveSingleUpstream(['Manual Trigger', 'Webhook Trigger'], new Set());
		expect(result).toBeUndefined();
	});

	it('returns undefined when there are no parents', () => {
		const result = resolveSingleUpstream([], new Set());
		expect(result).toBeUndefined();
	});
});
