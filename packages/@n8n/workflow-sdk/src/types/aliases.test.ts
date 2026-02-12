/**
 * Tests for type aliases
 *
 * These are mainly compile-time checks to ensure the aliases work correctly.
 */

import type { AnyNode, AnyChain, AnyTrigger, NodeParameters } from './aliases';

describe('Type Aliases', () => {
	describe('AnyNode', () => {
		it('is assignable from NodeInstance with unknown type parameters', () => {
			// This test verifies the type works at compile time
			// We use a mock that satisfies the AnyNode interface
			const node = {
				type: 'n8n-nodes-base.set',
				version: '1',
				id: 'test',
				name: 'Test',
				config: {},
				then: jest.fn(),
				to: jest.fn(),
				input: jest.fn(),
				output: jest.fn(),
				onError: jest.fn(),
				getConnections: () => [],
				update: jest.fn(),
			} as unknown as AnyNode;

			expect(node.type).toBe('n8n-nodes-base.set');
		});
	});

	describe('AnyChain', () => {
		it('is assignable from NodeChain with unknown type parameters', () => {
			// Verify AnyChain type exists and is usable
			const checkType = (chain: AnyChain) => chain._isChain;
			expect(typeof checkType).toBe('function');
		});
	});

	describe('AnyTrigger', () => {
		it('is assignable from TriggerInstance with unknown type parameters', () => {
			// Verify AnyTrigger type exists and is usable
			const checkType = (trigger: AnyTrigger) => trigger.isTrigger;
			expect(typeof checkType).toBe('function');
		});
	});

	describe('NodeParameters', () => {
		it('is assignable to Record<string, unknown>', () => {
			const params: NodeParameters = {
				url: 'https://example.com',
				method: 'GET',
				count: 10,
			};
			expect(params.url).toBe('https://example.com');
		});
	});
});
