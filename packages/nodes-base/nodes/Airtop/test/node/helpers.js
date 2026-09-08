import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
export const node = {
    id: '1',
    name: 'Airtop node',
    typeVersion: 1,
    type: 'n8n-nodes-base.airtop',
    position: [10, 10],
    parameters: {},
};
export const createMockExecuteFunction = (nodeParameters) => {
    const fakeExecuteFunction = {
        getInputData() {
            return [{ json: {} }];
        },
        getNodeParameter(parameterName, _itemIndex, fallbackValue, options) {
            const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
            return get(nodeParameters, parameter, fallbackValue);
        },
        getNode() {
            return node;
        },
        helpers: {
            constructExecutionMetaData,
            returnJsonArray: (data) => {
                return [{ json: data }];
            },
            prepareBinaryData: async (data) => {
                return {
                    mimeType: 'image/jpeg',
                    fileType: 'jpg',
                    fileName: 'screenshot.jpg',
                    data: data.toString('base64'),
                };
            },
        },
        continueOnFail: () => false,
        logger: {
            info: () => { },
        },
    };
    return fakeExecuteFunction;
};
//# sourceMappingURL=helpers.js.map