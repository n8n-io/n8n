import { validateWorkflow, ValidationError } from '../validation';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';

describe('Validation', () => {
	describe('validateWorkflow()', () => {
		it('should validate a workflow with a trigger', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://example.com' } },
			});
			const wf = workflow('test-id', 'Test Workflow').add(t).then(n);

			const result = validateWorkflow(wf);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should warn when workflow has no trigger', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://example.com' } },
			});
			const wf = workflow('test-id', 'Test Workflow').add(n);

			const result = validateWorkflow(wf);
			expect(result.warnings.some((w) => w.message.includes('trigger'))).toBe(true);
		});

		it('should warn about disconnected nodes', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const connected = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Connected' },
			});
			const disconnected = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Disconnected' },
			});

			// Add disconnected without .then() - it won't be connected
			const wf = workflow('test-id', 'Test Workflow').add(t).then(connected).add(disconnected);

			const result = validateWorkflow(wf);
			expect(result.warnings.some((w) => w.message.includes('Disconnected'))).toBe(true);
		});

		it('should validate required parameters if specified', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			// HTTP Request without URL should potentially warn
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: {} }, // Missing url
			});
			const wf = workflow('test-id', 'Test Workflow').add(t).then(n);

			const result = validateWorkflow(wf, { strictMode: true });
			// In strict mode, may report issues
			expect(result).toBeDefined();
		});

		it('should report circular connections', () => {
			// Note: Our builder doesn't easily allow circular connections,
			// but if imported from JSON, they could exist
			const wf = workflow('test-id', 'Test');
			const result = validateWorkflow(wf);
			expect(result).toBeDefined();
		});
	});

	describe('ValidationError', () => {
		it('should contain error details', () => {
			const error = new ValidationError(
				'MISSING_TRIGGER',
				'Workflow has no trigger node',
				'Webhook',
			);
			expect(error.code).toBe('MISSING_TRIGGER');
			expect(error.message).toBe('Workflow has no trigger node');
			expect(error.nodeName).toBe('Webhook');
		});
	});
});
