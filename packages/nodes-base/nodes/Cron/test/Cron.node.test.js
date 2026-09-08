import get from 'lodash/get';
import { Cron } from '../Cron.node';
describe('Cron Node', () => {
    const node = new Cron();
    const createMockExecuteFunction = (nodeParameters) => {
        const fakeExecuteFunction = {
            getNodeParameter(parameterName, fallbackValue, options) {
                const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
                const parameterValue = get(nodeParameters, parameter, fallbackValue);
                return parameterValue;
            },
        };
        return fakeExecuteFunction;
    };
    const triggerFunctions = createMockExecuteFunction({
        triggerTimes: {
            item: [],
        },
    });
    it('should return a function to trigger', async () => {
        expect(await node.trigger.call(triggerFunctions)).toEqual({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            manualTriggerFunction: expect.any(Function),
        });
    });
});
//# sourceMappingURL=Cron.node.test.js.map