import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'vitest-mock-extended';
import { ExecutionData } from '../ExecutionData.node';
describe('ExecutionData Node', () => {
    it('should return its input data', async () => {
        const mockInputData = [
            { json: { item: 0, foo: 'bar' } },
            { json: { item: 1, foo: 'quz' } },
        ];
        const executeFns = mock({
            getInputData: () => mockInputData,
            getNode: () => mock({ typeVersion: 1 }),
        });
        const result = await new ExecutionData().execute.call(executeFns);
        expect(result).toEqual([mockInputData]);
    });
    it('should set nullish values to empty string', async () => {
        const mockInputData = [
            { json: { item: 0, foo: undefined } },
            { json: { item: 1, foo: null } },
            { json: { item: 1, foo: 'bar' } },
        ];
        const setAllMock = vi.fn();
        const executeFns = mock({
            customData: mock({ setAll: setAllMock }),
            getInputData: () => mockInputData,
            getNode: () => mock({ typeVersion: 1.1 }),
        });
        executeFns.getNodeParameter.mockReturnValueOnce('save');
        executeFns.getNodeParameter.mockReturnValueOnce({ values: [{ key: 'foo', value: undefined }] });
        executeFns.getNodeParameter.mockReturnValueOnce({ values: [{ key: 'foo', value: null }] });
        executeFns.getNodeParameter.mockReturnValueOnce({ values: [{ key: 'foo', value: 'bar' }] });
        const result = await new ExecutionData().execute.call(executeFns);
        expect(setAllMock).toBeCalledTimes(3);
        expect(setAllMock).toBeCalledWith({ foo: '' });
        expect(setAllMock).toBeCalledWith({ foo: '' });
        expect(setAllMock).toBeCalledWith({ foo: 'bar' });
        expect(result).toEqual([mockInputData]);
    });
});
describe('ExecutionData -> Should run the workflow', () => {
    new NodeTestHarness().setupTests();
});
//# sourceMappingURL=ExecutionData.node.test.js.map