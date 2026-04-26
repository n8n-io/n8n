/**
 * Integration tests for useWorkflowDocumentExpression.
 *
 * These tests use a real Pinia store (createPinia, not createTestingPinia) so
 * that every write goes through the actual workflowsStore and every read comes
 * back through the public API. This "round-trip" pattern (write → read back →
 * assert) is intentional:
 *
 *  - It catches regressions when consumers migrate from workflowsStore to
 *    workflowDocumentStore — the round-trip proves both paths produce the same
 *    result.
 *  - It survives internal refactors. When the internals change (e.g. owning
 *    its own refs instead of delegating), these tests stay unchanged because
 *    they only exercise the public contract.
 *  - Delegation-style tests (expect(store.method).toHaveBeenCalled()) would
 *    need to be rewritten every time internals change; round-trips do not.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkflowDocumentExpression } from './useWorkflowDocumentExpression';
import { useWorkflowDocumentWorkflowObject } from './useWorkflowDocumentWorkflowObject';
import type { INodeTypes } from 'n8n-workflow';

function createMockNodeTypes(): INodeTypes {
	return {
		getByName: vi.fn(),
		getByNameAndVersion: vi.fn(),
		getKnownTypes: vi.fn().mockReturnValue({}),
	};
}

describe('useWorkflowDocumentExpression', () => {
	let workflowObject: ReturnType<typeof useWorkflowDocumentWorkflowObject>['workflowObject'];

	beforeEach(() => {
		setActivePinia(createPinia());
		const wfObj = useWorkflowDocumentWorkflowObject({
			workflowId: '',
			getNodeTypes: () => createMockNodeTypes(),
		});
		workflowObject = wfObj.workflowObject;
	});

	describe('getExpressionHandler', () => {
		it('returns the expression resolver instance', () => {
			const expression = useWorkflowDocumentExpression(workflowObject);

			const handler = expression.getExpressionHandler();
			expect(handler).toBeDefined();
			expect(typeof handler.getParameterValue).toBe('function');
			expect(typeof handler.getSimpleParameterValue).toBe('function');
			expect(typeof handler.convertObjectValueToString).toBe('function');
		});

		it('convertObjectValueToString converts object to string', () => {
			const expression = useWorkflowDocumentExpression(workflowObject);

			const handler = expression.getExpressionHandler();
			const result = handler.convertObjectValueToString({ key: 'value' });
			expect(typeof result).toBe('string');
		});
	});
});
