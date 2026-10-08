import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import fc from 'fast-check';
import { mock } from 'vitest-mock-extended';

import type { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import {
	importWorkflowPackage,
	type WorkflowPackageImportRules,
} from '@/modules/n8n-packages/capabilities/workflow-package-import';
import type { ProjectService } from '@/services/project.service.ee';

import { user } from '../../__tests__/linked-instances.test-helpers';
import {
	assertUpdatableByPull,
	LocalPackageImport,
	pullImportRules,
	type SetPulledMcpAccess,
} from '../local-package-import';
import { TRANSFER_MESSAGES, TRANSFER_WARNINGS } from '../transfer-errors';
import { workflowEntity } from './transfer.test-helpers';

vi.mock('@/modules/n8n-packages/capabilities/workflow-package-import', () => ({
	importWorkflowPackage: vi.fn(),
}));
vi.mock('@/modules/n8n-packages/capabilities/mcp-package-size-limit', () => ({
	instanceMcpPackageSizeLimit: () => ({ maxBytes: 1024, setting: 'N8N_PAYLOAD_SIZE_MAX' }),
}));

/** A workflow that an earlier pull of remote workflow `r1` made. */
const pulledCopy = (overrides: Partial<WorkflowEntity> = {}) =>
	workflowEntity({ id: 'local1', sourceWorkflowId: 'r1', ...overrides });

describe('assertUpdatableByPull', () => {
	it('lets a pull update the copy of an earlier pull', () => {
		expect(() => assertUpdatableByPull(pulledCopy())).not.toThrow();
	});

	it('refuses to update a workflow that was made here and has the same ID, and names it', () => {
		const original = () =>
			assertUpdatableByPull(workflowEntity({ name: 'Billing', sourceWorkflowId: null }));

		expect(original).toThrow(BadRequestError);
		expect(original).toThrow(TRANSFER_MESSAGES.sameIdLocalWorkflow('Billing'));
	});

	it('refuses to update an archived copy and names it', () => {
		const archived = () =>
			assertUpdatableByPull(pulledCopy({ name: 'Daily report', isArchived: true }));

		expect(archived).toThrow(BadRequestError);
		expect(archived).toThrow(TRANSFER_MESSAGES.archivedLocalCopy('Daily report'));
	});

	it('refuses a workflow without a source for that reason first, also when it is archived', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(null, undefined, ''),
				fc.boolean(),
				fc.string({ minLength: 1 }),
				(sourceWorkflowId, isArchived, name) => {
					const workflow = workflowEntity({ name, isArchived, sourceWorkflowId });

					expect(() => assertUpdatableByPull(workflow)).toThrow(
						TRANSFER_MESSAGES.sameIdLocalWorkflow(name),
					);
				},
			),
		);
	});
});

describe('pullImportRules', () => {
	const alice = user();

	it('gives no earlier MCP access for a new workflow', async () => {
		const setMcpAccess = vi.fn<SetPulledMcpAccess>().mockResolvedValue([]);
		const rules = pullImportRules(setMcpAccess);

		expect(await rules.afterImport?.(alice, 'local1')).toEqual([]);
		expect(setMcpAccess).toHaveBeenCalledWith(alice, 'local1', undefined);
	});

	it.each([
		[{ availableInMCP: true }, true],
		[{ availableInMCP: false }, false],
		[{}, false],
		[undefined, false],
	])(
		'gives the MCP access of the updated workflow (settings %j) to the last step',
		async (settings, previous) => {
			const setMcpAccess = vi.fn<SetPulledMcpAccess>().mockResolvedValue([]);
			const rules = pullImportRules(setMcpAccess);

			rules.assertUpdatable(pulledCopy({ settings }));
			await rules.afterImport?.(alice, 'local1');

			expect(setMcpAccess).toHaveBeenCalledWith(alice, 'local1', previous);
		},
	);

	it('keeps the state of each pull apart', async () => {
		const setMcpAccess = vi.fn<SetPulledMcpAccess>().mockResolvedValue([]);
		const update = pullImportRules(setMcpAccess);
		const create = pullImportRules(setMcpAccess);

		update.assertUpdatable(pulledCopy({ settings: { availableInMCP: true } }));
		await create.afterImport?.(alice, 'local2');
		await update.afterImport?.(alice, 'local1');

		expect(setMcpAccess.mock.calls).toEqual([
			[alice, 'local2', undefined],
			[alice, 'local1', true],
		]);
	});

	it('returns the warnings of the last step', async () => {
		const rules = pullImportRules(async () => [TRANSFER_WARNINGS.mcpAccessNotSet]);

		expect(await rules.afterImport?.(alice, 'local1')).toEqual([TRANSFER_WARNINGS.mcpAccessNotSet]);
	});
});

describe('LocalPackageImport', () => {
	const alice = user();

	function importSetup() {
		const mcpSettings = mock<McpSettingsService>();
		const logger = mock<Logger>();
		const service = new LocalPackageImport(mock<ProjectService>(), mcpSettings, logger);
		mcpSettings.getAutoExposeNewWorkflows.mockResolvedValue(false);
		mcpSettings.broadcastWorkflowMCPAvailabilityChanged.mockResolvedValue();
		mcpSettings.bulkSetAvailableInMCP.mockResolvedValue({
			updatedCount: 1,
			unchangedCount: 0,
			skippedCount: 0,
			failedCount: 0,
			changedWorkflows: [{ workflowId: 'local1', settings: { availableInMCP: false } }],
		});
		/** Runs the import and returns the rules that it gave the package import. */
		async function rulesOfImport(): Promise<WorkflowPackageImportRules> {
			await service.importPackage(alice, { packageBase64: 'cGtn', sourceWorkflowId: 'r1' });
			const rules = vi.mocked(importWorkflowPackage).mock.calls[0]?.[0].rules;
			if (!rules) throw new Error('The import got no rules');
			return rules;
		}
		return { service, mcpSettings, logger, rulesOfImport };
	}

	beforeEach(() => {
		vi.mocked(importWorkflowPackage).mockReset();
	});

	it('imports with the size limit of this instance and the source workflow', async () => {
		const { service } = importSetup();

		await service.importPackage(alice, {
			packageBase64: 'cGtn',
			projectId: 'p1',
			sourceWorkflowId: 'r1',
		});

		expect(importWorkflowPackage).toHaveBeenCalledWith(
			expect.objectContaining({
				user: alice,
				packageBase64: 'cGtn',
				limit: { maxBytes: 1024, setting: 'N8N_PAYLOAD_SIZE_MAX' },
				projectId: 'p1',
				sourceWorkflowId: 'r1',
			}),
		);
	});

	it.each([false, true])(
		'gives a new workflow the MCP access of new workflows here (%s), not the one of the package',
		async (autoExpose) => {
			const { mcpSettings, rulesOfImport } = importSetup();
			mcpSettings.getAutoExposeNewWorkflows.mockResolvedValue(autoExpose);
			const rules = await rulesOfImport();

			expect(await rules.afterImport?.(alice, 'local1')).toEqual([]);
			expect(mcpSettings.bulkSetAvailableInMCP).toHaveBeenCalledWith(alice, {
				workflowIds: ['local1'],
				availableInMCP: autoExpose,
			});
			expect(mcpSettings.broadcastWorkflowMCPAvailabilityChanged).toHaveBeenCalledWith([
				{ workflowId: 'local1', settings: { availableInMCP: false } },
			]);
		},
	);

	it.each([false, true])(
		'keeps the MCP access (%s) of a workflow that the pull updates',
		async (previous) => {
			const { mcpSettings, rulesOfImport } = importSetup();
			mcpSettings.getAutoExposeNewWorkflows.mockResolvedValue(!previous);
			const rules = await rulesOfImport();

			rules.assertUpdatable(pulledCopy({ settings: { availableInMCP: previous } }));
			await rules.afterImport?.(alice, 'local1');

			expect(mcpSettings.bulkSetAvailableInMCP).toHaveBeenCalledWith(alice, {
				workflowIds: ['local1'],
				availableInMCP: previous,
			});
			expect(mcpSettings.getAutoExposeNewWorkflows).not.toHaveBeenCalled();
		},
	);

	it('makes a new workflow unavailable in MCP when the setting cannot be read', async () => {
		const { mcpSettings, logger, rulesOfImport } = importSetup();
		mcpSettings.getAutoExposeNewWorkflows.mockRejectedValue(new Error('cache down'));
		const rules = await rulesOfImport();

		await rules.afterImport?.(alice, 'local1');

		expect(mcpSettings.bulkSetAvailableInMCP).toHaveBeenCalledWith(alice, {
			workflowIds: ['local1'],
			availableInMCP: false,
		});
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not read the MCP access setting for new workflows',
			{ error: 'cache down' },
		);
	});

	it('accepts a workflow that has the MCP access already', async () => {
		const { mcpSettings, rulesOfImport } = importSetup();
		mcpSettings.bulkSetAvailableInMCP.mockResolvedValue({
			updatedCount: 0,
			unchangedCount: 1,
			skippedCount: 0,
			failedCount: 0,
			changedWorkflows: [],
		});
		const rules = await rulesOfImport();

		expect(await rules.afterImport?.(alice, 'local1')).toEqual([]);
	});

	it('warns when the user cannot change the MCP access of the workflow', async () => {
		const { mcpSettings, rulesOfImport } = importSetup();
		mcpSettings.bulkSetAvailableInMCP.mockResolvedValue({
			updatedCount: 0,
			unchangedCount: 0,
			skippedCount: 1,
			failedCount: 0,
			changedWorkflows: [],
		});
		const rules = await rulesOfImport();

		expect(await rules.afterImport?.(alice, 'local1')).toEqual([TRANSFER_WARNINGS.mcpAccessNotSet]);
	});

	it('warns and logs ids only when the MCP access cannot be written', async () => {
		const { mcpSettings, logger, rulesOfImport } = importSetup();
		mcpSettings.bulkSetAvailableInMCP.mockRejectedValue(new Error('SQLITE_BUSY'));
		const rules = await rulesOfImport();

		expect(await rules.afterImport?.(alice, 'local1')).toEqual([TRANSFER_WARNINGS.mcpAccessNotSet]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not set the MCP access of a workflow from a linked instance',
			{ workflowId: 'local1', error: 'SQLITE_BUSY' },
		);
	});
});
