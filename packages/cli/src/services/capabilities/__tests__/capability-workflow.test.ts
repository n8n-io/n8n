// Only a DI token here. A stub keeps the large import graph of the finder out of the test.
vi.mock('@/workflows/workflow-finder.service', () => ({ WorkflowFinderService: class {} }));

import { mockInstance } from '@n8n/backend-test-utils';
import { UrlService } from '@n8n/backend-services';
import { User, type WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowAccessError } from '@/modules/mcp/mcp.errors';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { CapabilitySurface } from '../capability';
import { findCapabilityWorkflow } from '../capability-workflow';

const user = Object.assign(new User(), { id: 'user-1' });

const storedWorkflow = (overrides: Partial<WorkflowEntity> = {}) =>
	({
		id: 'wf-1',
		isArchived: false,
		settings: { availableInMCP: true },
		...overrides,
	}) as WorkflowEntity;

describe('findCapabilityWorkflow', () => {
	const finder = mock<WorkflowFinderService>();
	const find = async (surface: CapabilitySurface) =>
		await findCapabilityWorkflow(finder, 'wf-1', { user, surface }, ['workflow:update']);

	beforeEach(() => {
		finder.findWorkflowForUser.mockReset();
		mockInstance(UrlService).getInstanceBaseUrl.mockReturnValue('http://n8n.local');
	});

	it.each<CapabilitySurface>(['mcp', 'assistant'])(
		'returns the workflow that the user can reach on the %s surface',
		async (surface) => {
			const workflow = storedWorkflow();
			finder.findWorkflowForUser.mockResolvedValue(workflow);

			await expect(find(surface)).resolves.toBe(workflow);
			expect(finder.findWorkflowForUser.mock.calls[0].slice(0, 3)).toEqual([
				'wf-1',
				user,
				['workflow:update'],
			]);
		},
	);

	it.each<CapabilitySurface>(['mcp', 'assistant'])(
		'rejects a workflow that the user cannot reach on the %s surface',
		async (surface) => {
			finder.findWorkflowForUser.mockResolvedValue(null);

			const result = find(surface);

			await expect(result).rejects.toThrow(WorkflowAccessError);
			await expect(result).rejects.toMatchObject({ reason: 'no_permission' });
		},
	);

	describe('on the MCP surface', () => {
		it('rejects a workflow that is not available in MCP', async () => {
			finder.findWorkflowForUser.mockResolvedValue(storedWorkflow({ settings: {} }));

			await expect(find('mcp')).rejects.toMatchObject({ reason: 'not_available_in_mcp' });
		});

		it('rejects an archived workflow', async () => {
			finder.findWorkflowForUser.mockResolvedValue(storedWorkflow({ isArchived: true }));

			await expect(find('mcp')).rejects.toMatchObject({ reason: 'workflow_archived' });
		});
	});

	describe('on the Assistant surface', () => {
		it('returns a workflow that is not available in MCP', async () => {
			const workflow = storedWorkflow({ settings: {} });
			finder.findWorkflowForUser.mockResolvedValue(workflow);

			await expect(find('assistant')).resolves.toBe(workflow);
		});

		it('returns an archived workflow, so that the capability can restore it', async () => {
			const workflow = storedWorkflow({ isArchived: true });
			finder.findWorkflowForUser.mockResolvedValue(workflow);

			await expect(find('assistant')).resolves.toBe(workflow);
		});
	});
});
