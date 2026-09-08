import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import { resolveDataTableId } from '../../common/utils';
const mockNode = {
    id: 'test-node',
    name: 'Test Node',
    type: 'n8n-nodes-base.dataTable',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
};
describe('resolveDataTableId', () => {
    describe('list mode', () => {
        it('should return the value directly when mode is list', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const resourceLocator = {
                mode: 'list',
                value: 'table-id-123',
            };
            const result = await resolveDataTableId(ctx, resourceLocator);
            expect(result).toBe('table-id-123');
        });
        it('should handle UUIDs in list mode', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const resourceLocator = {
                mode: 'list',
                value: '550e8400-e29b-41d4-a716-446655440000',
            };
            const result = await resolveDataTableId(ctx, resourceLocator);
            expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
        });
    });
    describe('id mode', () => {
        it('should return the value directly when mode is id', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const resourceLocator = {
                mode: 'id',
                value: 'custom-table-id',
            };
            const result = await resolveDataTableId(ctx, resourceLocator);
            expect(result).toBe('custom-table-id');
        });
        it('should handle numeric IDs in id mode', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const resourceLocator = {
                mode: 'id',
                value: '12345',
            };
            const result = await resolveDataTableId(ctx, resourceLocator);
            expect(result).toBe('12345');
        });
    });
    describe('name mode', () => {
        it('should look up table by name and return its ID', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const mockAggregateProxy = {
                getManyAndCount: vi.fn().mockResolvedValue({
                    data: [{ id: 'resolved-table-id', name: 'my table' }],
                    count: 1,
                }),
            };
            ctx.helpers = {
                getDataTableAggregateProxy: vi.fn().mockResolvedValue(mockAggregateProxy),
            };
            const resourceLocator = {
                mode: 'name',
                value: 'My Table',
            };
            const result = await resolveDataTableId(ctx, resourceLocator);
            expect(result).toBe('resolved-table-id');
            expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
                filter: { name: 'my table' },
                take: 1,
            });
        });
        it('should convert table name to lowercase for lookup', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const mockAggregateProxy = {
                getManyAndCount: vi.fn().mockResolvedValue({
                    data: [{ id: 'table-id', name: 'customers' }],
                    count: 1,
                }),
            };
            ctx.helpers = {
                getDataTableAggregateProxy: vi.fn().mockResolvedValue(mockAggregateProxy),
            };
            const resourceLocator = {
                mode: 'name',
                value: 'CUSTOMERS',
            };
            await resolveDataTableId(ctx, resourceLocator);
            expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
                filter: { name: 'customers' },
                take: 1,
            });
        });
        it('should throw error when table name is not found', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const mockAggregateProxy = {
                getManyAndCount: vi.fn().mockResolvedValue({
                    data: [],
                    count: 0,
                }),
            };
            ctx.helpers = {
                getDataTableAggregateProxy: vi.fn().mockResolvedValue(mockAggregateProxy),
            };
            const resourceLocator = {
                mode: 'name',
                value: 'NonExistentTable',
            };
            await expect(resolveDataTableId(ctx, resourceLocator)).rejects.toThrow(NodeOperationError);
            await expect(resolveDataTableId(ctx, resourceLocator)).rejects.toThrow('Data table with name "NonExistentTable" not found');
        });
        it('should handle special characters in table names', async () => {
            const ctx = mock();
            ctx.getNode.mockReturnValue(mockNode);
            const mockAggregateProxy = {
                getManyAndCount: vi.fn().mockResolvedValue({
                    data: [{ id: 'table-id', name: 'users & customers' }],
                    count: 1,
                }),
            };
            ctx.helpers = {
                getDataTableAggregateProxy: vi.fn().mockResolvedValue(mockAggregateProxy),
            };
            const resourceLocator = {
                mode: 'name',
                value: 'Users & Customers',
            };
            const result = await resolveDataTableId(ctx, resourceLocator);
            expect(result).toBe('table-id');
            expect(mockAggregateProxy.getManyAndCount).toHaveBeenCalledWith({
                filter: { name: 'users & customers' },
                take: 1,
            });
        });
    });
});
//# sourceMappingURL=resolveDataTableId.test.js.map