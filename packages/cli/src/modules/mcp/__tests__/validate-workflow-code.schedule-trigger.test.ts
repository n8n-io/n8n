import type { Logger } from '@n8n/backend-common';
import type { DataTableUserOperations } from '@n8n/backend-module-data-table';
import type { UrlService } from '@n8n/backend-services';
import type { Project, ProjectRepository, User } from '@n8n/db';
import { getSchemaBaseDirs, setSchemaBaseDirs, validateNodeConfig } from '@n8n/workflow-sdk';
import { NoOp } from 'n8n-nodes-base/dist/nodes/NoOp/NoOp.node';
import { ScheduleTrigger } from 'n8n-nodes-base/dist/nodes/Schedule/ScheduleTrigger.node';
import type { INodeType, INodeTypes } from 'n8n-workflow';
import { dirname, join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';
import { createCreateWorkflowFromCodeTool } from '../tools/workflow-builder/create-workflow-from-code.tool';
import { createValidateWorkflowCodeTool } from '../tools/workflow-builder/validate-workflow-code.tool';

describe('MCP Schedule Trigger intervals', () => {
	const user = mock<User>({ id: 'user-1' });
	const telemetry = mock<Telemetry>();
	const workflowCreationService = mock<WorkflowCreationService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const urlService = mock<UrlService>();
	const credentialsService = mock<CredentialsService>();
	const projectRepository = mock<ProjectRepository>();
	const aiGatewayService = mock<AiGatewayService>();
	const nodeTypesByName = new Map<string, INodeType>([
		['n8n-nodes-base.scheduleTrigger', new ScheduleTrigger()],
		['n8n-nodes-base.noOp', new NoOp()],
	]);
	const nodeTypes = mock<INodeTypes>({
		getByNameAndVersion: (name) => {
			const nodeType = nodeTypesByName.get(name);
			if (!nodeType) throw new Error(`Unknown node type: ${name}`);
			return nodeType;
		},
	});
	let originalSchemaBaseDirs: string[];

	beforeEach(() => {
		vi.clearAllMocks();
		workflowCreationService.createWorkflow.mockImplementation(async (_user, workflow) =>
			Object.assign(workflow, { id: 'saved-workflow' }),
		);
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
		projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
			mock<Project>({ id: 'personal-project', name: 'Personal project', type: 'personal' }),
		);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
		aiGatewayService.isAvailable.mockResolvedValue({ available: false });
	});

	beforeAll(() => {
		originalSchemaBaseDirs = getSchemaBaseDirs();
		setSchemaBaseDirs([
			join(dirname(require.resolve('n8n-nodes-base/package.json')), 'dist', 'node-definitions'),
		]);
		// Check that schema validation runs instead of skipping an unavailable schema.
		expect(
			validateNodeConfig('n8n-nodes-base.scheduleTrigger', 1.3, {
				parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 'invalid' }] } },
			}).valid,
		).toBe(false);
	});

	afterAll(() => {
		setSchemaBaseDirs(originalSchemaBaseDirs);
	});

	const workflowCode = (intervals: Array<Record<string, unknown>>, version = 1.3) => `
				const schedule = trigger({
					type: 'n8n-nodes-base.scheduleTrigger',
					version: ${version},
					config: {
						name: 'Schedule Trigger',
						parameters: {
							rule: { interval: ${JSON.stringify(intervals)} },
						},
					},
				});
				const done = node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { name: 'Done' },
				});
				export default workflow('schedule-interval-test', 'Schedule interval test')
					.add(schedule.to(done));
			`;

	const validateCode = async (code: string) => {
		const tool = createValidateWorkflowCodeTool(user, telemetry, nodeTypes);
		return await tool.handler({ code });
	};

	const createTool = () =>
		createCreateWorkflowFromCodeTool(
			user,
			workflowCreationService,
			workflowFinderService,
			urlService,
			telemetry,
			nodeTypes,
			credentialsService,
			projectRepository,
			mock<DataTableUserOperations>(),
			aiGatewayService,
			{},
			mock<Logger>(),
			mock<McpPostSaveMetricsService>(),
		);

	const invalidIntervals = [
		{
			field: 'minutes',
			parameter: 'minutesInterval',
			value: 60,
			message: 'Minutes must be in range 1-59',
		},
		{
			field: 'seconds',
			parameter: 'secondsInterval',
			value: 60,
			message: 'Seconds must be in range 1-59',
		},
		{
			field: 'hours',
			parameter: 'hoursInterval',
			value: 24,
			message: 'Hours must be in range 1-23',
		},
		{
			field: 'minutes',
			parameter: 'minutesInterval',
			value: 0,
			message: 'Minutes must be in range 1-59',
		},
		{
			field: 'days',
			parameter: 'daysInterval',
			value: 32,
			message: 'Days must be in range 1-31',
		},
		{
			field: 'months',
			parameter: 'monthsInterval',
			value: 0,
			message: 'Months must be larger than 0',
		},
	].flatMap((interval) => [1.3, 1.4].map((version) => ({ ...interval, version })));

	// CONTEXT-490: Reject invalid intervals before the workflow reaches activation.
	test.each(invalidIntervals)(
		'rejects $parameter=$value in v$version with its allowed range',
		async ({ field, parameter, value, message, version }) => {
			const result = await validateCode(workflowCode([{ field, [parameter]: value }], version));

			expect(result.structuredContent).toMatchObject({
				valid: false,
				errors: expect.arrayContaining([expect.stringContaining(message)]),
			});
			expect(result.isError).toBe(true);
		},
	);

	test.each(invalidIntervals)(
		'does not save $parameter=$value in v$version through create_workflow_from_code',
		async ({ field, parameter, value, message, version }) => {
			const result = await createTool().handler({
				code: workflowCode([{ field, [parameter]: value }], version),
			});

			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining(message),
			});
			expect(result.isError).toBe(true);
			expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
		},
	);

	test.each([1.3, 1.4])(
		'identifies the node and interval in v%s when several Schedule Triggers exist',
		async (version) => {
			const code = `
				const daily = trigger({
					type: 'n8n-nodes-base.scheduleTrigger',
					version: ${version},
					config: {
						name: 'Daily schedule',
						parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } },
					},
				});
				const frequent = trigger({
					type: 'n8n-nodes-base.scheduleTrigger',
					version: ${version},
					config: {
						name: 'Frequent schedule',
						parameters: {
							rule: {
								interval: [
									{ field: 'minutes', minutesInterval: 5 },
									{ field: 'minutes', minutesInterval: 60 },
								],
							},
						},
					},
				});
				const done = node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { name: 'Done' },
				});
				export default workflow('multiple-schedules-test', 'Multiple schedules test')
					.add(daily.to(done))
					.add(frequent.to(done));
			`;
			const expectedError = "node 'Frequent schedule', interval 2: Minutes must be in range 1-59";

			const validated = await validateCode(code);
			const created = await createTool().handler({ code });

			expect(validated.structuredContent).toEqual({ valid: false, errors: [expectedError] });
			expect(created.structuredContent).toMatchObject({ error: expectedError });
			expect(validated.isError).toBe(true);
			expect(created.isError).toBe(true);
			expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
		},
	);

	test.each([
		{ field: 'seconds', parameter: 'secondsInterval', value: 1 },
		{ field: 'seconds', parameter: 'secondsInterval', value: 59 },
		{ field: 'minutes', parameter: 'minutesInterval', value: 1 },
		{ field: 'minutes', parameter: 'minutesInterval', value: 59 },
		{ field: 'hours', parameter: 'hoursInterval', value: 1 },
		{ field: 'hours', parameter: 'hoursInterval', value: 23 },
	])(
		'validates and saves $parameter=$value at the allowed boundary',
		async ({ field, parameter, value }) => {
			const interval = { field, [parameter]: value };
			const code = workflowCode([interval]);
			const result = await validateCode(code);

			expect(result.structuredContent).toEqual({ valid: true, nodeCount: 2 });
			expect(result.isError).toBeUndefined();

			const created = await createTool().handler({ code });

			expect(created.isError).toBeUndefined();
			expect(created.structuredContent).toMatchObject({
				workflowId: 'saved-workflow',
				nodeCount: 2,
			});
			expect(workflowCreationService.createWorkflow).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					nodes: expect.arrayContaining([
						expect.objectContaining({ parameters: { rule: { interval: [interval] } } }),
					]),
				}),
				expect.anything(),
				{},
			);
		},
	);

	test.each([
		{ name: 'default values', interval: {} },
		{ name: 'an omitted interval value', interval: { field: 'minutes' } },
		{
			name: 'an interval expression',
			interval: { field: 'minutes', minutesInterval: '={{ 5 }}' },
		},
		{
			name: 'an inactive interval parameter',
			interval: { field: 'minutes', minutesInterval: 5, hoursInterval: 24 },
		},
		{
			name: 'a cron expression',
			interval: { field: 'cronExpression', expression: '0 0 * * *' },
		},
		{ name: 'a large weeks interval', interval: { field: 'weeks', weeksInterval: 52 } },
		{ name: 'a large months interval', interval: { field: 'months', monthsInterval: 13 } },
	])('validates and saves $name', async ({ interval }) => {
		const code = workflowCode([interval]);
		const validated = await validateCode(code);
		const created = await createTool().handler({ code });

		expect(validated.structuredContent).toMatchObject({ valid: true, nodeCount: 2 });
		expect(validated.isError).toBeUndefined();
		expect(created.structuredContent).toMatchObject({ workflowId: 'saved-workflow' });
		expect(created.isError).toBeUndefined();
		expect(workflowCreationService.createWorkflow).toHaveBeenCalledOnce();
	});

	test.each([
		{
			name: 'an invalid second rule',
			intervals: [
				{ field: 'minutes', minutesInterval: 5 },
				{ field: 'minutes', minutesInterval: 60 },
			],
			message: 'Minutes must be in range 1-59',
		},
		{
			name: 'an invalid default days rule',
			intervals: [{ daysInterval: 32 }],
			message: 'Days must be in range 1-31',
		},
	])('rejects $name before saving', async ({ intervals, message }) => {
		const code = workflowCode(intervals);
		const validated = await validateCode(code);
		const created = await createTool().handler({ code });

		expect(validated.structuredContent).toMatchObject({
			valid: false,
			errors: expect.arrayContaining([expect.stringContaining(message)]),
		});
		expect(created.structuredContent).toMatchObject({ error: expect.stringContaining(message) });
		expect(validated.isError).toBe(true);
		expect(created.isError).toBe(true);
		expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
	});
});
