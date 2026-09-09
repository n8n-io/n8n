import { InstanceVersion, ModulePubSubPublisher, WorkflowProjectLookup } from '@n8n/backend-common';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { OwnershipService } from '@/services/ownership.service';

import { bindModulePorts } from '../module-ports';

describe('bindModulePorts', () => {
	const publisher = mock<Publisher>();
	const ownershipService = mock<OwnershipService>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(Publisher, publisher);
		Container.set(OwnershipService, ownershipService);
	});

	it('binds every port that a module resolves', () => {
		bindModulePorts();

		expect(Container.get(ModulePubSubPublisher)).toBeDefined();
		expect(Container.get(WorkflowProjectLookup)).toBeDefined();
		expect(Container.get(InstanceVersion)).toBeDefined();
	});

	it('constructs no service while binding', () => {
		const getSpy = vi.spyOn(Container, 'get');

		bindModulePorts();

		expect(getSpy).not.toHaveBeenCalled();
		getSpy.mockRestore();
	});

	it('delegates publishCommand to the publisher', async () => {
		bindModulePorts();

		await Container.get(ModulePubSubPublisher).publishCommand({ command: 'reload-otel-config' });

		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-otel-config' });
	});

	it('delegates getWorkflowProjectCached to the ownership service', async () => {
		bindModulePorts();
		const project = mock<Project>({ id: 'project-1' });
		// Assigned after construction: the mock helper deep-proxies nested values.
		project.customTelemetryTags = [{ key: 'team', value: 'core' }];
		ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

		const result = await Container.get(WorkflowProjectLookup).getWorkflowProjectCached('wf-1');

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('wf-1');
		expect(result).toEqual({
			id: 'project-1',
			customTelemetryTags: [{ key: 'team', value: 'core' }],
		});
	});

	it('passes no field the project port does not declare', async () => {
		bindModulePorts();
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-1', name: 'Team project', type: 'team' }),
		);

		const result = await Container.get(WorkflowProjectLookup).getWorkflowProjectCached('wf-1');

		expect(Object.keys(result).sort()).toEqual(['customTelemetryTags', 'id']);
	});

	it('reports the cli version', () => {
		bindModulePorts();

		expect(Container.get(InstanceVersion).version).toBe(N8N_VERSION);
	});
});
