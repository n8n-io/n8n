import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { RuntimeCredentialsImpactService } from '../runtime-credentials-impact.service';

const node = (type: string, parameters: INode['parameters'] = {}) =>
	({ id: type, name: type, type, typeVersion: 1, position: [0, 0], parameters }) as INode;

const workflow = (id: string, nodes: INode[]) =>
	({ id, name: `Workflow ${id}`, nodes }) as WorkflowEntity;

describe('RuntimeCredentialsImpactService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const service = new RuntimeCredentialsImpactService(workflowRepository);

	beforeEach(() => {
		workflowRepository.find.mockResolvedValue([
			workflow('1', [
				node('n8n-nodes-base.webhook'),
				node('n8n-nodes-base.set', { value: "={{ $json.headers['x-partner-token'] }}" }),
			]),
			workflow('2', [
				node('n8n-nodes-base.formTrigger'),
				node('n8n-nodes-base.set', { value: "={{ $json.headers['x-partner-token'] }}" }),
			]),
			workflow('3', [
				node('n8n-nodes-base.webhook'),
				node('n8n-nodes-base.set', { value: 'static' }),
			]),
		]);
	});

	it('lists the workflows with a matching trigger that read the field', async () => {
		await expect(
			service.findAffectedWorkflows('n8n-nodes-base.webhook', 'headers.x-partner-token'),
		).resolves.toEqual({ count: 1, workflows: [{ id: '1', name: 'Workflow 1' }] });
	});

	it('looks at every trigger type for a rule on any trigger', async () => {
		const impact = await service.findAffectedWorkflows('*', 'headers.x-partner-token');

		expect(impact.count).toBe(2);
	});

	it('does not count a workflow that reads another field', async () => {
		const impact = await service.findAffectedWorkflows('*', 'body.password');

		expect(impact).toEqual({ count: 0, workflows: [] });
	});

	it('matches an array path by its last two keys', async () => {
		workflowRepository.find.mockResolvedValue([
			workflow('4', [
				node('n8n-nodes-base.webhook'),
				node('n8n-nodes-base.set', { value: '={{ $json.body.items[0].id }}' }),
			]),
		]);

		const impact = await service.findAffectedWorkflows('*', 'body.items[*].id');

		expect(impact.count).toBe(1);
	});

	it('does not count a workflow that reads the field under another parent', async () => {
		workflowRepository.find.mockResolvedValue([
			workflow('5', [
				node('n8n-nodes-base.webhook'),
				node('n8n-nodes-base.set', { value: '={{ $json.query.token }}' }),
			]),
		]);

		const impact = await service.findAffectedWorkflows('*', 'headers.token');

		expect(impact.count).toBe(0);
	});
});
