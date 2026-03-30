import { mock } from 'jest-mock-extended';
import type { Span } from '@opentelemetry/api';

import { SpanRegistry } from '../span-registry';

describe('SpanRegistry', () => {
	let registry: SpanRegistry;

	beforeEach(() => {
		registry = new SpanRegistry();
	});

	describe('workflow spans', () => {
		it('should add and retrieve a workflow span', () => {
			const span = mock<Span>();
			registry.addWorkflow('exec-1', span);
			expect(registry.getWorkflow('exec-1')).toBe(span);
		});

		it('should return undefined for missing workflow span', () => {
			expect(registry.getWorkflow('nonexistent')).toBeUndefined();
		});

		it('should remove and return a workflow span', () => {
			const span = mock<Span>();
			registry.addWorkflow('exec-1', span);

			const removed = registry.removeWorkflow('exec-1');
			expect(removed).toBe(span);
			expect(registry.getWorkflow('exec-1')).toBeUndefined();
		});

		it('should return undefined when removing a nonexistent workflow span', () => {
			expect(registry.removeWorkflow('nonexistent')).toBeUndefined();
		});
	});

	describe('node spans', () => {
		it('should add and retrieve a node span', () => {
			const span = mock<Span>();
			registry.addNode('exec-1', 'node-a', span);
			expect(registry.getNode('exec-1', 'node-a')).toBe(span);
		});

		it('should return undefined for missing node span', () => {
			expect(registry.getNode('exec-1', 'nonexistent')).toBeUndefined();
		});

		it('should remove and return a node span', () => {
			const span = mock<Span>();
			registry.addNode('exec-1', 'node-a', span);

			const removed = registry.removeNode('exec-1', 'node-a');
			expect(removed).toBe(span);
			expect(registry.getNode('exec-1', 'node-a')).toBeUndefined();
		});

		it('should isolate node spans across executions', () => {
			const span1 = mock<Span>();
			const span2 = mock<Span>();
			registry.addNode('exec-1', 'node-a', span1);
			registry.addNode('exec-2', 'node-a', span2);

			expect(registry.getNode('exec-1', 'node-a')).toBe(span1);
			expect(registry.getNode('exec-2', 'node-a')).toBe(span2);
		});
	});

	describe('cleanup', () => {
		it('should remove all spans for an execution', () => {
			const wfSpan = mock<Span>();
			const nodeSpan1 = mock<Span>();
			const nodeSpan2 = mock<Span>();

			registry.addWorkflow('exec-1', wfSpan);
			registry.addNode('exec-1', 'node-a', nodeSpan1);
			registry.addNode('exec-1', 'node-b', nodeSpan2);

			registry.cleanup('exec-1');

			expect(registry.getWorkflow('exec-1')).toBeUndefined();
			expect(registry.getNode('exec-1', 'node-a')).toBeUndefined();
			expect(registry.getNode('exec-1', 'node-b')).toBeUndefined();
		});

		it('should not affect other executions', () => {
			const span1 = mock<Span>();
			const span2 = mock<Span>();

			registry.addWorkflow('exec-1', span1);
			registry.addWorkflow('exec-2', span2);

			registry.cleanup('exec-1');

			expect(registry.getWorkflow('exec-1')).toBeUndefined();
			expect(registry.getWorkflow('exec-2')).toBe(span2);
		});
	});

	describe('static key methods', () => {
		it('should generate workflow key from executionId', () => {
			expect(SpanRegistry.workflowKey('exec-1')).toBe('exec-1');
		});

		it('should generate node key from executionId and nodeId', () => {
			expect(SpanRegistry.nodeKey('exec-1', 'node-a')).toBe('exec-1:node-a');
		});
	});
});
