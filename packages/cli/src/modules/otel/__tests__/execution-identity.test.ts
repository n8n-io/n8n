import type { Context } from '@opentelemetry/api';
import { propagation, ROOT_CONTEXT } from '@opentelemetry/api';

import {
	buildExecutionIdentity,
	toExecutionIdentity,
	withExecutionIdentity,
} from '../execution-identity';
import { OtelTestProvider } from './support/otel-test-provider';

describe('execution identity', () => {
	const fullIdentity = {
		'n8n.execution.id': 'exec-1',
		'n8n.workflow.id': 'wf-1',
		'n8n.workflow.name': 'My workflow',
		'n8n.project.id': 'proj-1',
		'n8n.project.name': 'Finance',
	};

	describe('buildExecutionIdentity', () => {
		it('should map the source to the five identity attributes', () => {
			expect(
				buildExecutionIdentity({
					executionId: 'exec-1',
					workflowId: 'wf-1',
					workflowName: 'My workflow',
					projectId: 'proj-1',
					projectName: 'Finance',
				}),
			).toEqual(fullIdentity);
		});

		it('should skip empty and missing values', () => {
			expect(
				buildExecutionIdentity({ executionId: 'exec-1', workflowId: 'wf-1', workflowName: '' }),
			).toEqual({ 'n8n.execution.id': 'exec-1', 'n8n.workflow.id': 'wf-1' });
		});
	});

	describe('toExecutionIdentity', () => {
		it('should accept a saved identity', () => {
			expect(toExecutionIdentity(fullIdentity)).toEqual(fullIdentity);
		});

		it.each([
			undefined,
			{ 'n8n.workflow.id': 'wf-1' },
			{ 'n8n.execution.id': 'exec-1', 'n8n.workflow.id': 42 },
		])('should reject an incomplete or malformed identity (%j)', (value) => {
			expect(toExecutionIdentity(value)).toBeUndefined();
		});
	});

	describe('ExecutionIdentitySpanProcessor', () => {
		let otel: OtelTestProvider;

		beforeAll(() => {
			otel = OtelTestProvider.create();
		});

		afterAll(async () => {
			await otel.shutdown();
		});

		beforeEach(() => {
			otel.reset();
		});

		const startAndEndSpan = (ctx: Context) => {
			otel.provider.getTracer('test').startSpan('span', {}, ctx).end();
			return otel.getFinishedSpans()[0];
		};

		it('should copy the execution identity of the context to the span', () => {
			const span = startAndEndSpan(withExecutionIdentity(ROOT_CONTEXT, fullIdentity));

			expect(span.attributes).toEqual(fullIdentity);
		});

		it('should not copy n8n entries from caller baggage', () => {
			const callerBaggage = propagation.createBaggage({
				'n8n.execution.id': { value: 'forged' },
				'n8n.project.name': { value: 'forged' },
			});
			const ctx = withExecutionIdentity(ROOT_CONTEXT, fullIdentity);
			const span = startAndEndSpan(propagation.setBaggage(ctx, callerBaggage));

			expect(span.attributes).toEqual(fullIdentity);
		});

		it('should not add attributes when the context has no execution identity', () => {
			const callerBaggage = propagation.createBaggage({ 'n8n.execution.id': { value: 'forged' } });

			expect(
				startAndEndSpan(propagation.setBaggage(ROOT_CONTEXT, callerBaggage)).attributes,
			).toEqual({});
		});
	});
});
