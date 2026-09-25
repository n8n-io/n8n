import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import { EventMessageTypeNames } from 'n8n-workflow';
import promClient from 'prom-client';

import { PrometheusEventBusMetricsService } from '../event-bus-metrics.service';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

vi.mock('prom-client');

describe('PrometheusEventBusMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeMessageEventBusMetrics: true,
		includeCredentialTypeLabel: false,
		includeWorkflowIdLabel: false,
		includeWorkflowNameLabel: false,
		includeNodeTypeLabel: false,
	});
	const eventBus = mock<MessageEventBus>();
	let service: PrometheusEventBusMetricsService;
	let mockCounterInc: Mock;

	function getEventBusHandler(): (event: unknown) => void {
		const calls = eventBus.on.mock.calls as unknown as Array<[string, (event: unknown) => void]>;
		return calls.find((call) => call[0] === 'metrics.eventBus.event')![1];
	}

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeMessageEventBusMetrics: true,
			includeCredentialTypeLabel: false,
			includeWorkflowIdLabel: false,
			includeWorkflowNameLabel: false,
			includeNodeTypeLabel: false,
		});
		service = new PrometheusEventBusMetricsService(eventBus, config);
		mockCounterInc = vi.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
		(promClient.validateMetricName as Mock).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('should be true when includeMessageEventBusMetrics is true', () => {
			config.includeMessageEventBusMetrics = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeMessageEventBusMetrics is false', () => {
			config.includeMessageEventBusMetrics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should subscribe to metrics.eventBus.event on the event bus', () => {
			service.init();
			expect(eventBus.on.mock.calls).toContainEqual([
				'metrics.eventBus.event',
				expect.any(Function),
			]);
		});
	});

	describe('event handling', () => {
		it('should create a counter with credential_type label for audit credential events when includeCredentialTypeLabel is true', () => {
			config.includeCredentialTypeLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.audit,
				eventName: 'n8n.audit.user.credentials.created',
				payload: { credentialType: 'n8n-nodes-base.googleApi' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_audit_user_credentials_created_total',
				help: 'Total number of n8n.audit.user.credentials.created events.',
				labelNames: ['credential_type'],
			});

			expect(mockCounterInc).toHaveBeenCalledWith(
				{ credential_type: 'n8n-nodes-base_googleApi' },
				1,
			);
		});

		it('should normalize dots in credential type to underscores', () => {
			config.includeCredentialTypeLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.audit,
				eventName: 'n8n.audit.user.credentials.created',
				payload: { credentialType: 'my.company.customApi' },
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ credential_type: 'my_company_customApi' }, 1);
		});

		it('should create a counter with no labels for audit credential events when includeCredentialTypeLabel is false', () => {
			config.includeCredentialTypeLabel = false;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.audit,
				eventName: 'n8n.audit.user.credentials.created',
				payload: { credentialType: 'n8n-nodes-base.googleApi' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_audit_user_credentials_created_total',
				help: 'Total number of n8n.audit.user.credentials.created events.',
				labelNames: [],
			});

			expect(mockCounterInc).toHaveBeenCalledWith({}, 1);
		});

		it('should default credential_type to "unknown" when missing from payload', () => {
			config.includeCredentialTypeLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.audit,
				eventName: 'n8n.audit.user.credentials.created',
				payload: {},
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ credential_type: 'unknown' }, 1);
		});

		it('should create a counter with workflow_id label for audit workflow events when includeWorkflowIdLabel is true', () => {
			config.includeWorkflowIdLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.audit,
				eventName: 'n8n.audit.workflow.created',
				payload: { workflowId: 'wf_123' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_audit_workflow_created_total',
				help: 'Total number of n8n.audit.workflow.created events.',
				labelNames: ['workflow_id'],
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ workflow_id: 'wf_123' }, 1);
		});

		it('should create a counter with workflow_name label for audit workflow events when includeWorkflowNameLabel is true', () => {
			config.includeWorkflowNameLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.audit,
				eventName: 'n8n.audit.workflow.created',
				payload: { workflowName: 'My Workflow' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_audit_workflow_created_total',
				help: 'Total number of n8n.audit.workflow.created events.',
				labelNames: ['workflow_name'],
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ workflow_name: 'My Workflow' }, 1);
		});

		it('should create a counter with node_type label for node events when includeNodeTypeLabel is true', () => {
			config.includeNodeTypeLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.node,
				eventName: 'n8n.node.execution.started',
				payload: { nodeType: 'n8n-nodes-base.if' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_node_execution_started_total',
				help: 'Total number of n8n.node.execution.started events.',
				labelNames: ['node_type'],
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ node_type: 'base_if' }, 1);
		});

		it('should include workflow_id label for node events when includeWorkflowIdLabel is true', () => {
			config.includeWorkflowIdLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.node,
				eventName: 'n8n.node.execution.started',
				payload: { workflowId: 'wf_123' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ labelNames: ['workflow_id'] }),
			);
			expect(mockCounterInc).toHaveBeenCalledWith({ workflow_id: 'wf_123' }, 1);
		});

		it('should include workflow_name label for node events when includeWorkflowNameLabel is true', () => {
			config.includeWorkflowNameLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.node,
				eventName: 'n8n.node.execution.started',
				payload: { workflowName: 'My Workflow' },
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ workflow_name: 'My Workflow' }, 1);
		});

		it('should include all labels combined for node events', () => {
			config.includeWorkflowIdLabel = true;
			config.includeWorkflowNameLabel = true;
			config.includeNodeTypeLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.node,
				eventName: 'n8n.node.execution.started',
				payload: {
					workflowId: 'wf_123',
					workflowName: 'Fake Workflow Name',
					nodeType: 'n8n-nodes-base.if',
				},
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_node_execution_started_total',
				help: 'Total number of n8n.node.execution.started events.',
				labelNames: ['workflow_id', 'workflow_name', 'node_type'],
			});

			expect(mockCounterInc).toHaveBeenCalledWith(
				{ workflow_id: 'wf_123', workflow_name: 'Fake Workflow Name', node_type: 'base_if' },
				1,
			);
		});

		it('should include workflow_id label for workflow events', () => {
			config.includeWorkflowIdLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.workflow,
				eventName: 'n8n.workflow.execution.finished',
				payload: { workflowId: 'wf_456' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_workflow_execution_finished_total',
				help: 'Total number of n8n.workflow.execution.finished events.',
				labelNames: ['workflow_id'],
			});
			expect(mockCounterInc).toHaveBeenCalledWith({ workflow_id: 'wf_456' }, 1);
		});

		it('should include workflow_name label for workflow events', () => {
			config.includeWorkflowNameLabel = true;
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.workflow,
				eventName: 'n8n.workflow.execution.finished',
				payload: { workflowName: 'Fake Workflow Name' },
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ workflow_name: 'Fake Workflow Name' }, 1);
		});

		it('should create a counter with no labels for workflow events when all flags are off', () => {
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.workflow,
				eventName: 'n8n.workflow.execution.finished',
				payload: { workflowId: 'wf_789' },
			});

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_workflow_execution_finished_total',
				help: 'Total number of n8n.workflow.execution.finished events.',
				labelNames: [],
			});
			expect(mockCounterInc).toHaveBeenCalledWith({}, 1);
		});

		it('should reuse the same counter on repeated events (Counter constructed once, inc called twice)', () => {
			service.init();

			const handler = getEventBusHandler();
			const mockEvent = {
				__type: EventMessageTypeNames.workflow,
				eventName: 'n8n.workflow.execution.finished',
				payload: {},
			};

			handler(mockEvent);
			handler(mockEvent);

			// Counter should be constructed only once
			const counterCalls = vi
				.mocked(promClient.Counter)
				.mock.calls.filter((c) => c[0]?.name === 'n8n_workflow_execution_finished_total');
			expect(counterCalls).toHaveLength(1);

			// inc should be called twice
			expect(mockCounterInc).toHaveBeenCalledTimes(2);
		});

		it('should not create a counter when validateMetricName returns false', () => {
			(promClient.validateMetricName as Mock).mockReturnValue(false);
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.workflow,
				eventName: 'n8n.workflow.execution.finished',
				payload: {},
			});

			expect(promClient.Counter).not.toHaveBeenCalled();
			expect(mockCounterInc).not.toHaveBeenCalled();
		});

		it('should apply custom prefix to counter names', () => {
			config.prefix = 'custom_';
			service.init();

			const handler = getEventBusHandler();
			handler({
				__type: EventMessageTypeNames.workflow,
				eventName: 'n8n.workflow.execution.finished',
				payload: {},
			});

			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_workflow_execution_finished_total' }),
			);
		});
	});
});
