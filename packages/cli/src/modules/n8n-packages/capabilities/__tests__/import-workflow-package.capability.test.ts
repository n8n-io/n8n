import { UrlService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { User, WorkflowEntity } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';

import { WorkflowAccessError } from '@/modules/mcp/mcp.errors';
import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { MCP_IMPORT_RULES } from '../import-workflow-package.capability';

const user = Object.assign(new User(), { id: 'user-1' });

const workflow = (overrides: Partial<WorkflowEntity> = {}) =>
	Object.assign(new WorkflowEntity(), {
		id: 'wf-1',
		name: 'Daily report',
		isArchived: false,
		settings: { availableInMCP: true },
		...overrides,
	});

const bulkResult = (counts: { updatedCount: number; unchangedCount: number }) => ({
	...counts,
	skippedCount: 0,
	failedCount: 0,
	changedWorkflows:
		counts.updatedCount > 0 ? [{ workflowId: 'wf-1', settings: { availableInMCP: true } }] : [],
});

describe('MCP_IMPORT_RULES.assertUpdatable', () => {
	beforeEach(() => {
		mockInstance(UrlService, { getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.test') });
	});

	it('accepts a workflow that is available in MCP and not archived', () => {
		expect(() => MCP_IMPORT_RULES.assertUpdatable(workflow())).not.toThrow();
	});

	it.each([
		{
			case: 'not available in MCP',
			overrides: { settings: { availableInMCP: false } },
			reason: 'not_available_in_mcp',
			detail: 'Workflow is not available in MCP.',
		},
		{
			case: 'archived',
			overrides: { isArchived: true },
			reason: 'workflow_archived',
			detail: "Workflow 'wf-1' is archived and cannot be accessed.",
		},
	])('rejects a workflow that is $case and keeps the reason', ({ overrides, reason, detail }) => {
		let caught: unknown;
		try {
			MCP_IMPORT_RULES.assertUpdatable(workflow(overrides));
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(WorkflowAccessError);
		expect(caught).toMatchObject({ reason });
		const message = (caught as WorkflowAccessError).message;
		expect(message).toMatch(
			/^The package matches the workflow "Daily report" \(wf-1\) in the target project, so the import would update that workflow\. /,
		);
		expect(message).toContain(detail);
		expect(message).toMatch(/ You can also import the package into another project\.$/);
	});
});

describe('MCP_IMPORT_RULES.afterImport', () => {
	it('turns on MCP access for the workflow and tells open editors', async () => {
		const result = bulkResult({ updatedCount: 1, unchangedCount: 0 });
		const settings = mockInstance(McpSettingsService, {
			bulkSetAvailableInMCP: vi.fn().mockResolvedValue(result),
			broadcastWorkflowMCPAvailabilityChanged: vi.fn().mockResolvedValue(undefined),
		});

		const warnings = await MCP_IMPORT_RULES.afterImport?.(user, 'wf-1');

		expect(warnings).toEqual([]);
		expect(settings.bulkSetAvailableInMCP).toHaveBeenCalledWith(user, {
			workflowIds: ['wf-1'],
			availableInMCP: true,
		});
		expect(settings.broadcastWorkflowMCPAvailabilityChanged).toHaveBeenCalledWith(
			result.changedWorkflows,
		);
	});

	it('gives no warning when MCP access was already on', async () => {
		mockInstance(McpSettingsService, {
			bulkSetAvailableInMCP: vi
				.fn()
				.mockResolvedValue(bulkResult({ updatedCount: 0, unchangedCount: 1 })),
			broadcastWorkflowMCPAvailabilityChanged: vi.fn().mockResolvedValue(undefined),
		});

		expect(await MCP_IMPORT_RULES.afterImport?.(user, 'wf-1')).toEqual([]);
	});

	// For example, the user may create workflows in the project but not change them.
	it('warns when it cannot turn on MCP access', async () => {
		mockInstance(McpSettingsService, {
			bulkSetAvailableInMCP: vi
				.fn()
				.mockResolvedValue(bulkResult({ updatedCount: 0, unchangedCount: 0 })),
			broadcastWorkflowMCPAvailabilityChanged: vi.fn().mockResolvedValue(undefined),
		});

		expect(await MCP_IMPORT_RULES.afterImport?.(user, 'wf-1')).toEqual([
			'The workflow is not available in MCP, so MCP clients cannot change it. Turn on MCP access in its workflow settings.',
		]);
	});

	// The workflow is already written, so the import must not report a failure.
	it('gives a warning without internal details when turning on MCP access fails', async () => {
		const settings = mockInstance(McpSettingsService, {
			bulkSetAvailableInMCP: vi
				.fn()
				.mockRejectedValue(new Error('SQLITE_BUSY: table "workflow_entity" is locked')),
			broadcastWorkflowMCPAvailabilityChanged: vi.fn().mockResolvedValue(undefined),
		});

		expect(await MCP_IMPORT_RULES.afterImport?.(user, 'wf-1')).toEqual([
			'Could not turn on MCP access: an internal error occurred. The server log has the details. The workflow is not available in MCP, so MCP clients cannot change it. Turn on MCP access in its workflow settings.',
		]);
		expect(settings.broadcastWorkflowMCPAvailabilityChanged).not.toHaveBeenCalled();
	});

	it('gives the message of an error that the user can fix', async () => {
		mockInstance(McpSettingsService, {
			bulkSetAvailableInMCP: vi
				.fn()
				.mockRejectedValue(new ForbiddenError('You cannot change this workflow.')),
			broadcastWorkflowMCPAvailabilityChanged: vi.fn().mockResolvedValue(undefined),
		});

		expect(await MCP_IMPORT_RULES.afterImport?.(user, 'wf-1')).toEqual([
			'Could not turn on MCP access: You cannot change this workflow. The workflow is not available in MCP, so MCP clients cannot change it. Turn on MCP access in its workflow settings.',
		]);
	});
});

describe('MCP_IMPORT_RULES.errorWorkflowRule', () => {
	let finder: ReturnType<typeof mockInstance<WorkflowFinderService>>;

	beforeEach(() => {
		mockInstance(UrlService, { getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.test') });
		finder = mockInstance(WorkflowFinderService);
	});

	const rule = async () => await MCP_IMPORT_RULES.errorWorkflowRule?.(user, 'wf-err');

	it('accepts an error workflow that is available in MCP and not archived', async () => {
		finder.findWorkflowForUser.mockResolvedValue(workflow({ id: 'wf-err' }));

		expect(await rule()).toBeUndefined();
		expect(finder.findWorkflowForUser).toHaveBeenCalledWith('wf-err', user, ['workflow:read']);
	});

	it.each([
		['not available in MCP', { settings: {} }, 'it is not available in MCP'],
		['archived', { isArchived: true }, 'it is archived'],
	])('gives why an error workflow that is %s is not usable', async (_case, overrides, text) => {
		finder.findWorkflowForUser.mockResolvedValue(workflow({ id: 'wf-err', ...overrides }));

		expect(await rule()).toBe(text);
	});

	it('says the same for an error workflow that the user cannot read as for a missing one', async () => {
		finder.findWorkflowForUser.mockResolvedValue(null);

		expect(await rule()).toBe('it is not on this instance or you cannot open it');
	});

	it('gives the error of a failed lookup to the caller', async () => {
		finder.findWorkflowForUser.mockRejectedValue(new Error('Connection lost'));

		await expect(rule()).rejects.toThrow('Connection lost');
	});
});

describe('MCP_IMPORT_RULES.classifyFailure', () => {
	it('gives the audit reason of an MCP access error and leaves other errors', () => {
		expect(
			MCP_IMPORT_RULES.classifyFailure?.(
				new WorkflowAccessError('Not available', 'not_available_in_mcp'),
			),
		).toBe('access-denied');
		expect(MCP_IMPORT_RULES.classifyFailure?.(new Error('Other'))).toBeUndefined();
	});
});
