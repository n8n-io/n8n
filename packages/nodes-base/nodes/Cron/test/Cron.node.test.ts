import type { ITriggerFunctions, TriggerTime } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Cron } from '../Cron.node';

describe('Cron Node', () => {
	const node = new Cron();

	const helpers = mock<ITriggerFunctions['helpers']>();
	const triggerFunctions = mock<ITriggerFunctions>({ helpers });

	beforeEach(() => {
		vi.clearAllMocks();
		triggerFunctions.getNodeParameter.mockReturnValue({ item: [] });
		helpers.returnJsonArray.mockReturnValue([{ json: {} }]);
	});

	it('should return a function to trigger', async () => {
		expect(await node.trigger.call(triggerFunctions)).toEqual({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			manualTriggerFunction: expect.any(Function),
		});
	});

	it('passes each evaluated trigger time to the scheduling helper', async () => {
		const triggerTimes: TriggerTime[] = [
			{ mode: 'everyDay', hour: 9, minute: 30 },
			{ mode: 'custom', cronExpression: '15 */5 * * * *' },
		];
		triggerFunctions.getNodeParameter.mockReturnValue({ item: triggerTimes });

		await node.trigger.call(triggerFunctions);

		expect(helpers.registerCron).toHaveBeenCalledTimes(2);
		expect(helpers.registerCron).toHaveBeenNthCalledWith(
			1,
			{
				expression: expect.stringMatching(/^\d+ 30 9 \* \* \*$/),
				triggerTime: triggerTimes[0],
			},
			expect.any(Function),
		);
		expect(helpers.registerCron).toHaveBeenNthCalledWith(
			2,
			{ expression: '15 */5 * * * *', triggerTime: triggerTimes[1] },
			expect.any(Function),
		);
	});

	it('emits an empty item from the legacy cron callback', async () => {
		triggerFunctions.getNodeParameter.mockReturnValue({ item: [{ mode: 'everyMinute' }] });
		await node.trigger.call(triggerFunctions);

		const [, onTick] = helpers.registerCron.mock.calls[0];
		onTick(new Date());

		expect(helpers.returnJsonArray).toHaveBeenCalledWith([{}]);
		expect(triggerFunctions.emit).toHaveBeenCalledWith([[{ json: {} }]]);
	});

	it('emits an empty item when triggered manually without rules', async () => {
		triggerFunctions.getNodeParameter.mockReturnValue({});
		const response = await node.trigger.call(triggerFunctions);

		await response.manualTriggerFunction?.();

		expect(helpers.registerCron).not.toHaveBeenCalled();
		expect(triggerFunctions.emit).toHaveBeenCalledWith([[{ json: {} }]]);
	});
});
