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

		it.each([['getInputFirst'], ['getInputLast'], ['getInputAll']] as const)(
			'parses a valid %s envelope',
			(type) => {
				const parsed = bridgeMessageSchema.parse({ type });
				expect(parsed.type).toBe(type);
			},
		);

		it('parses a valid getItems envelope (no args)', () => {
			const parsed = bridgeMessageSchema.parse({ type: 'getItems' });
			expect(parsed.type).toBe('getItems');
		});

		it('parses a valid getItems envelope (all args)', () => {
			const parsed = bridgeMessageSchema.parse({
				type: 'getItems',
				nodeName: 'Foo',
				outputIndex: 0,
				runIndex: 2,
			});
			expect(parsed.type).toBe('getItems');
		});

		it('parses a valid fromAi envelope', () => {
			const parsed = bridgeMessageSchema.parse({
				type: 'fromAi',
				name: 'placeholder',
				description: 'A description',
				valueType: 'string',
				defaultValue: 'fallback',
			});
			expect(parsed.type).toBe('fromAi');
		});

		it.each([['getNodePairedItem'], ['getNodeItemMatching']] as const)(
			'parses a valid %s envelope with itemIndex',
			(type) => {
				const parsed = bridgeMessageSchema.parse({ type, nodeName: 'Foo', itemIndex: 2 });
				expect(parsed.type).toBe(type);
			},
		);

		it.each([['getNodePairedItem'], ['getNodeItemMatching']] as const)(
			'parses a valid %s envelope without itemIndex',
			(type) => {
				const parsed = bridgeMessageSchema.parse({ type, nodeName: 'Foo' });
				expect(parsed.type).toBe(type);
			},
		);

		it('parses a valid getNodeItem envelope', () => {
			const parsed = bridgeMessageSchema.parse({ type: 'getNodeItem', nodeName: 'Foo' });
			expect(parsed.type).toBe('getNodeItem');
		});

		it('parses a valid evaluateExpression envelope (with itemIndex)', () => {
			const parsed = bridgeMessageSchema.parse({
				type: 'evaluateExpression',
				expression: '$json.value',
				itemIndex: 2,
			});
			expect(parsed.type).toBe('evaluateExpression');
		});

		it('parses a valid evaluateExpression envelope (without itemIndex)', () => {
			const parsed = bridgeMessageSchema.parse({
				type: 'evaluateExpression',
				expression: '$json.value',
			});
			expect(parsed.type).toBe('evaluateExpression');
		});

		it('rejects an unknown discriminator value', () => {
			expect(() => bridgeMessageSchema.parse({ type: 'evalArbitrary', nodeName: 'Foo' })).toThrow();
		});

		it('rejects a missing discriminator', () => {
			expect(() => bridgeMessageSchema.parse({ nodeName: 'Foo' })).toThrow();
		});
	});

	describe('getInput* — no extra fields allowed', () => {
		it.each([['getInputFirst'], ['getInputLast'], ['getInputAll']] as const)(
			'rejects %s with extra fields (.strict)',
			(type) => {
				expect(() => bridgeMessageSchema.parse({ type, nodeName: 'Foo' })).toThrow();
				expect(() => bridgeMessageSchema.parse({ type, branchIndex: 0 })).toThrow();
			},
		);
	});

	describe('paired-item cluster', () => {
		it.each([['getNodePairedItem'], ['getNodeItemMatching']] as const)(
			'%s rejects negative itemIndex',
			(type) => {
				expect(() => bridgeMessageSchema.parse({ type, nodeName: 'Foo', itemIndex: -1 })).toThrow();
			},
		);

		it.each([['getNodePairedItem'], ['getNodeItemMatching']] as const)(
			'%s rejects non-integer itemIndex',
			(type) => {
				expect(() =>
					bridgeMessageSchema.parse({ type, nodeName: 'Foo', itemIndex: 1.5 }),
				).toThrow();
			},
		);

		it.each([['getNodePairedItem'], ['getNodeItemMatching'], ['getNodeItem']] as const)(
			'%s rejects missing nodeName',
			(type) => {
				expect(() => bridgeMessageSchema.parse({ type })).toThrow();
			},
		);

		it.each([['getNodePairedItem'], ['getNodeItemMatching'], ['getNodeItem']] as const)(
			'%s rejects extra fields (.strict)',
			(type) => {
				expect(() =>
					bridgeMessageSchema.parse({ type, nodeName: 'Foo', branchIndex: 0 }),
				).toThrow();
			},
		);

		it('getNodeItem rejects itemIndex field', () => {
			// getNodeItem covers the getter form (no args) — schema doesn't
			// permit itemIndex since the host's getter takes none.
			expect(() =>
				bridgeMessageSchema.parse({ type: 'getNodeItem', nodeName: 'Foo', itemIndex: 0 }),
			).toThrow();
		});
	});

	describe('evaluateExpression', () => {
		it('rejects missing expression', () => {
			expect(() => bridgeMessageSchema.parse({ type: 'evaluateExpression' })).toThrow();
		});

		it('rejects non-string expression', () => {
			expect(() =>
				bridgeMessageSchema.parse({ type: 'evaluateExpression', expression: 42 }),
			).toThrow();
		});

		it('rejects negative itemIndex', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'evaluateExpression',
					expression: 'x',
					itemIndex: -1,
				}),
			).toThrow();
		});

		it('rejects extra fields (.strict)', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'evaluateExpression',
					expression: 'x',
					branchIndex: 0,
				}),
			).toThrow();
		});
	});

	describe('getPairedItem', () => {
		it('parses a minimal valid envelope (null source)', () => {
			const parsed = bridgeMessageSchema.parse({
				type: 'getPairedItem',
				destinationNodeName: 'Foo',
				incomingSourceData: null,
				initialPairedItem: { item: 0 },
			});
			expect(parsed.type).toBe('getPairedItem');
		});

		it('parses a fully populated envelope (nested sourceOverwrite)', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getPairedItem',
					destinationNodeName: 'Foo',
					incomingSourceData: {
						previousNode: 'Src',
						previousNodeOutput: 0,
						previousNodeRun: 1,
					},
					initialPairedItem: {
						item: 2,
						input: 0,
						sourceOverwrite: { previousNode: 'Other' },
					},
				}),
			).not.toThrow();
		});

		it('rejects missing destinationNodeName', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getPairedItem',
					incomingSourceData: null,
					initialPairedItem: { item: 0 },
				}),
			).toThrow();
		});

		it('rejects negative item index', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getPairedItem',
					destinationNodeName: 'Foo',
					incomingSourceData: null,
					initialPairedItem: { item: -1 },
				}),
			).toThrow();
		});

		it('rejects extra fields on the envelope (.strict)', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getPairedItem',
					destinationNodeName: 'Foo',
					incomingSourceData: null,
					initialPairedItem: { item: 0 },
					usedMethodName: '$getPairedItem',
				}),
			).toThrow();
		});

		it('rejects extra fields on nested sourceData (.strict)', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getPairedItem',
					destinationNodeName: 'Foo',
					incomingSourceData: { previousNode: 'Src', hijack: 'x' },
					initialPairedItem: { item: 0 },
				}),
			).toThrow();
		});

		it('rejects extra fields on nested pairedItemData (.strict)', () => {
			expect(() =>
				bridgeMessageSchema.parse({
					type: 'getPairedItem',
					destinationNodeName: 'Foo',
					incomingSourceData: null,
					initialPairedItem: { item: 0, hijack: 'x' },
				}),
			).toThrow();
		});
	});

	describe('fromAi', () => {
		it('accepts a minimal envelope (type only)', () => {
			// `name` is optional in the schema so empty calls reach the host's
			// friendly `ExpressionError("Add a key, e.g. $fromAI(...)")` rather
			// than a generic zod error.
			expect(() => bridgeMessageSchema.parse({ type: 'fromAi' })).not.toThrow();
		});

		it('accepts arbitrary defaultValue shapes', () => {
			// defaultValue is z.unknown() — host applies no shape constraint.
			for (const defaultValue of [42, 'str', true, null, { nested: 1 }, [1, 2]]) {
				expect(() =>
					bridgeMessageSchema.parse({ type: 'fromAi', name: 'a', defaultValue }),
				).not.toThrow();
			}
		});

		it('rejects non-string name', () => {
			expect(() => bridgeMessageSchema.parse({ type: 'fromAi', name: 123 })).toThrow();
		});

		it('rejects non-string description / valueType', () => {
			expect(() =>
				bridgeMessageSchema.parse({ type: 'fromAi', name: 'a', description: 1 }),
			).toThrow();
			expect(() =>
				bridgeMessageSchema.parse({ type: 'fromAi', name: 'a', valueType: 1 }),
			).toThrow();
		});

		it('rejects extra fields (.strict)', () => {
			expect(() =>
				bridgeMessageSchema.parse({ type: 'fromAi', name: 'a', hijack: 'extra' }),
			).toThrow();
		});
	});

	describe('getItems', () => {
		it('accepts negative runIndex (host -1 sentinel for "latest")', () => {
			// Unlike branchIndex/runIndex on getNode*, getItems allows negative
			// runIndex because WorkflowDataProxy.$items uses -1 as a sentinel
			// for "latest run". The schema is `z.number().int()` without
			// .nonnegative() — guard the behaviour explicitly.
			expect(() =>
				bridgeMessageSchema.parse({ type: 'getItems', nodeName: 'Foo', runIndex: -1 }),
			).not.toThrow();
		});

		it('rejects non-integer runIndex', () => {
			expect(() =>
				bridgeMessageSchema.parse({ type: 'getItems', nodeName: 'Foo', runIndex: 1.5 }),
			).toThrow();
		});

		it('rejects negative outputIndex', () => {
			// outputIndex is still nonnegative — there's no host sentinel for it.
			expect(() =>
				bridgeMessageSchema.parse({ type: 'getItems', nodeName: 'Foo', outputIndex: -1 }),
			).toThrow();
		});

		it('rejects extra fields (.strict)', () => {
			expect(() =>
				bridgeMessageSchema.parse({ type: 'getItems', nodeName: 'Foo', branchIndex: 0 }),
			).toThrow();
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
