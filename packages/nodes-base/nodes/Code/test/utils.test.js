import { mock } from 'vitest-mock-extended';
import { addPostExecutionWarning } from '../utils';
describe('addPostExecutionWarning', () => {
    const context = mock();
    const inputItemsLength = 2;
    beforeEach(() => vi.resetAllMocks());
    it('should add execution hints when returnData length differs from inputItemsLength', () => {
        const returnData = [{ json: {}, pairedItem: 0 }];
        addPostExecutionWarning(context, returnData, inputItemsLength);
        expect(context.addExecutionHints).toHaveBeenCalledWith({
            message: 'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
            location: 'outputPane',
        });
    });
    it('should add execution hints when any item has undefined pairedItem', () => {
        const returnData = [{ json: {}, pairedItem: 0 }, { json: {} }];
        addPostExecutionWarning(context, returnData, inputItemsLength);
        expect(context.addExecutionHints).toHaveBeenCalledWith({
            message: 'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
            location: 'outputPane',
        });
    });
    it('should not add execution hints when all items match inputItemsLength and have defined pairedItem', () => {
        const returnData = [
            { json: {}, pairedItem: 0 },
            { json: {}, pairedItem: 1 },
        ];
        addPostExecutionWarning(context, returnData, inputItemsLength);
        expect(context.addExecutionHints).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=utils.test.js.map