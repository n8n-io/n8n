import { mockDeep } from 'vitest-mock-extended';
export const testNode = {
    id: 'test',
    name: 'Confluence',
    type: 'n8n-nodes-base.confluence',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
};
export function mockExecuteCtx(params, items = 1) {
    const ctx = mockDeep();
    ctx.getInputData.mockReturnValue(Array.from({ length: items }, () => ({ json: {} })));
    ctx.getNodeParameter.mockImplementation((name, _i, fallback, options) => {
        const value = name in params ? params[name] : fallback;
        // Mimic extractValue unwrapping a resource locator to its value, so a
        // call site that forgets to ask for extraction fails the assertions.
        if (options?.extractValue && value && typeof value === 'object' && 'value' in value) {
            return value.value;
        }
        return value;
    });
    ctx.getNode.mockReturnValue(testNode);
    ctx.helpers.returnJsonArray.mockImplementation((data) => (Array.isArray(data) ? data : [data]).map((json) => ({ json })));
    ctx.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) => data.map((entry) => ({ ...entry, pairedItem: itemData })));
    return ctx;
}
//# sourceMappingURL=shared.js.map