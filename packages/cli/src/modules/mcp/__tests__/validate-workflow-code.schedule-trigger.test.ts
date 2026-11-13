import type { User } from '@n8n/db';
import { getSchemaBaseDirs, setSchemaBaseDirs, validateNodeConfig } from '@n8n/workflow-sdk';
import { NoOp } from 'n8n-nodes-base/dist/nodes/NoOp/NoOp.node';
import { ScheduleTrigger } from 'n8n-nodes-base/dist/nodes/Schedule/ScheduleTrigger.node';
import type { INodeType, INodeTypes } from 'n8n-workflow';
import { dirname, join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { createValidateWorkflowCodeTool } from '../tools/workflow-builder/validate-workflow-code.tool';

describe('validate_workflow Schedule Trigger intervals', () => {
	const user = mock<User>({ id: 'user-1' });
	const telemetry = mock<Telemetry>();
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

	const validateInterval = async (field: string, parameter: string, value: number) => {
		const tool = createValidateWorkflowCodeTool(user, telemetry, nodeTypes);
		return await tool.handler({
			code: `
				const schedule = trigger({
					type: 'n8n-nodes-base.scheduleTrigger',
					version: 1.3,
					config: {
						name: 'Schedule Trigger',
						parameters: {
							rule: { interval: [${JSON.stringify({ field, [parameter]: value })}] },
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
			`,
		});
	};

	// CONTEXT-490: Reject invalid intervals before the workflow reaches activation.
	test.each([
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
	])(
		'rejects $parameter=$value with its allowed range',
		async ({ field, parameter, value, message }) => {
			const result = await validateInterval(field, parameter, value);

			expect(result.structuredContent).toMatchObject({
				valid: false,
				errors: expect.arrayContaining([expect.stringContaining(message)]),
			});
			expect(result.isError).toBe(true);
		},
	);

	test.each([
		{ field: 'seconds', parameter: 'secondsInterval', value: 1 },
		{ field: 'seconds', parameter: 'secondsInterval', value: 59 },
		{ field: 'minutes', parameter: 'minutesInterval', value: 1 },
		{ field: 'minutes', parameter: 'minutesInterval', value: 59 },
		{ field: 'hours', parameter: 'hoursInterval', value: 1 },
		{ field: 'hours', parameter: 'hoursInterval', value: 23 },
	])('accepts $parameter=$value at the allowed boundary', async ({ field, parameter, value }) => {
		const result = await validateInterval(field, parameter, value);

		expect(result.structuredContent).toEqual({ valid: true, nodeCount: 2 });
		expect(result.isError).toBeUndefined();
	});
});
