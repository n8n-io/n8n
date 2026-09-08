import { NodeApiError } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';
const mockExecuteSingleFunctions = {
    getNode: vi.fn(() => ({ name: 'MockNode' })),
    getNodeParameter: vi.fn(),
};
describe('handleError', () => {
    let response;
    let data;
    beforeEach(() => {
        data = [{}];
        response = { statusCode: 200, body: {} };
    });
    test('should return data when no error occurs', async () => {
        const result = await handleError.call(mockExecuteSingleFunctions, data, response);
        expect(result).toBe(data);
    });
    test('should throw NodeApiError for EntityAlreadyExists with user conflict', async () => {
        mockExecuteSingleFunctions.getNodeParameter = vi
            .fn()
            .mockReturnValueOnce('user')
            .mockReturnValueOnce('existingUserName');
        response.statusCode = 400;
        response.body = {
            Error: { Code: 'EntityAlreadyExists', Message: 'User "existingUserName" already exists' },
        };
        const promise = handleError.call(mockExecuteSingleFunctions, data, response);
        await expect(promise).rejects.toThrow(NodeApiError);
        await expect(promise).rejects.toThrow('User "existingUserName" already exists');
    });
    test('should throw NodeApiError for NoSuchEntity with user not found', async () => {
        mockExecuteSingleFunctions.getNodeParameter
            .mockReturnValueOnce('user')
            .mockReturnValueOnce('nonExistentUser');
        response.statusCode = 404;
        response.body = {
            Error: { Code: 'NoSuchEntity', Message: 'User "nonExistentUser" does not exist' },
        };
        const promise = handleError.call(mockExecuteSingleFunctions, data, response);
        await expect(promise).rejects.toThrow(NodeApiError);
        await expect(promise).rejects.toThrow('User "nonExistentUser" does not exist');
    });
    test('should throw generic error if no specific mapping exists', async () => {
        mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('container');
        response.statusCode = 400;
        response.body = { Error: { Code: 'BadRequest', Message: 'Invalid request' } };
        const promise = handleError.call(mockExecuteSingleFunctions, data, response);
        await expect(promise).rejects.toThrow(NodeApiError);
        await expect(promise).rejects.toThrow('BadRequest');
    });
    test('should throw NodeApiError for EntityAlreadyExists with group conflict', async () => {
        mockExecuteSingleFunctions.getNodeParameter
            .mockReturnValueOnce('group')
            .mockReturnValue('existingGroupName');
        response.statusCode = 400;
        response.body = {
            Error: { Code: 'EntityAlreadyExists', Message: 'Group "existingGroupName" already exists' },
        };
        const promise = handleError.call(mockExecuteSingleFunctions, data, response);
        await expect(promise).rejects.toThrow(NodeApiError);
        await expect(promise).rejects.toThrow('Group "existingGroupName" already exists');
    });
    test('should throw NodeApiError for NoSuchEntity with group not found', async () => {
        mockExecuteSingleFunctions.getNodeParameter
            .mockReturnValueOnce('group')
            .mockReturnValue('nonExistentGroup');
        response.statusCode = 404;
        response.body = {
            Error: { Code: 'NoSuchEntity', Message: 'Group "nonExistentGroup" does not exist' },
        };
        const promise = handleError.call(mockExecuteSingleFunctions, data, response);
        await expect(promise).rejects.toThrow(NodeApiError);
        await expect(promise).rejects.toThrow('Group "nonExistentGroup" does not exist');
    });
    test('should throw NodeApiError for DeleteConflict', async () => {
        mockExecuteSingleFunctions.getNodeParameter
            .mockReturnValueOnce('user')
            .mockReturnValue('userInGroup');
        response.statusCode = 400;
        response.body = {
            Error: { Code: 'DeleteConflict', Message: 'User "userIngroup" is in a group' },
        };
        const promise = handleError.call(mockExecuteSingleFunctions, data, response);
        await expect(promise).rejects.toThrow(NodeApiError);
        await expect(promise).rejects.toThrow('User "userIngroup" is in a group');
    });
});
//# sourceMappingURL=errorHandler.test.js.map