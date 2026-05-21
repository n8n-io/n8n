/**
 * Schema-level unit tests for the typed-RPC bridge protocol.
 *
 * The integration-level tests in `__tests__/typed-rpc.test.ts` exercise
 * routing through the isolate. This file tests `bridgeMessageSchema`
 * directly: discriminator selection, `.strict()` enforcement, and the
 * `int().nonnegative()` constraint on index fields.
 *
 * Anything that crosses the trust boundary into the host must parse
 * successfully here; anything that fails to parse must not reach the
 * dispatcher's `switch`.
 */

import { describe, it, expect } from 'vitest';
import { bridgeMessageSchema } from '../bridge-messages';

describe('bridgeMessageSchema', () => {
	describe('discriminator', () => {
		it('parses a valid getNodeFirst envelope', () => {
			const parsed = bridgeMessageSchema.parse({
				type: 'getNodeFirst',
				nodeName: 'Foo',
				branchIndex: 0,
				runIndex: 0,
			});
			expect(parsed.type).toBe('getNodeFirst');
		});

		it('parses a valid getNodeLast envelope', () => {
			const parsed = bridgeMessageSchema.parse({ type: 'getNodeLast', nodeName: 'Foo' });
			expect(parsed.type).toBe('getNodeLast');
		});

		it('parses a valid getNodeAll envelope', () => {
			const parsed = bridgeMessageSchema.parse({ type: 'getNodeAll', nodeName: 'Foo' });
			expect(parsed.type).toBe('getNodeAll');
		});

		it('rejects an unknown discriminator value', () => {
			expect(() => bridgeMessageSchema.parse({ type: 'evalArbitrary', nodeName: 'Foo' })).toThrow();
		});

		it('rejects a missing discriminator', () => {
			expect(() => bridgeMessageSchema.parse({ nodeName: 'Foo' })).toThrow();
		});
	});

	describe('.strict() enforcement', () => {
		it('rejects extra fields on a known schema', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getNodeFirst',
					nodeName: 'Foo',
					hijack: 'arbitrary',
				}),
			).toThrow();
		});
	});

	describe('nodeName', () => {
		it('rejects non-string nodeName', () => {
			expect(() => bridgeMessageSchema.parse({ type: 'getNodeFirst', nodeName: 123 })).toThrow();
		});

		it('rejects missing nodeName', () => {
			expect(() => bridgeMessageSchema.parse({ type: 'getNodeFirst' })).toThrow();
		});
	});

	describe('branchIndex / runIndex', () => {
		it('accepts non-negative integers', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getNodeFirst',
					nodeName: 'Foo',
					branchIndex: 0,
					runIndex: 5,
				}),
			).not.toThrow();
		});

		it('rejects negative integers', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getNodeFirst',
					nodeName: 'Foo',
					branchIndex: -1,
				}),
			).toThrow();
		});

		it('rejects non-integer numbers', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getNodeFirst',
					nodeName: 'Foo',
					branchIndex: 1.5,
				}),
			).toThrow();
		});

		it('rejects NaN', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getNodeFirst',
					nodeName: 'Foo',
					branchIndex: NaN,
				}),
			).toThrow();
		});

		it('rejects Infinity', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getNodeFirst',
					nodeName: 'Foo',
					branchIndex: Infinity,
				}),
			).toThrow();
		});

		it('rejects string-encoded numbers', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getNodeFirst',
					nodeName: 'Foo',
					branchIndex: '0',
				}),
			).toThrow();
		});
	});
});
