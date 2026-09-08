import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
export const node = {
    id: '11',
    name: 'Airtable node',
    typeVersion: 2.2,
    type: 'n8n-nodes-base.airtable',
    position: [42, 42],
    parameters: {
        operation: 'create',
    },
};
export const createMockExecuteFunction = (nodeParameters, typeVersion = node.typeVersion) => {
    const mockNode = typeVersion === node.typeVersion ? node : { ...node, typeVersion };
    const fakeExecuteFunction = {
        getInputData: vi.fn(() => {
            return [{ json: {} }];
        }),
        getNodeParameter: vi.fn((parameterName, _itemIndex, fallbackValue, options) => {
            const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
            return get(nodeParameters, parameter, fallbackValue);
        }),
        getNode: vi.fn(() => {
            return mockNode;
        }),
        helpers: { constructExecutionMetaData: vi.fn(constructExecutionMetaData) },
        continueOnFail: vi.fn(() => false),
    };
    return fakeExecuteFunction;
};
//# sourceMappingURL=helpers.js.map