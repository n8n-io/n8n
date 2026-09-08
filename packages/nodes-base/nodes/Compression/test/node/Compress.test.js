import { mockDeep } from 'vitest-mock-extended';
import { Compression } from '../../Compression.node';
import { boundedUntar } from '../../decompress/BoundedUntar';
describe('Compression Node - Compress Operation (tar)', () => {
    let compression;
    let mockExecuteFunctions;
    // the archive buffer handed to prepareBinaryData by the node
    let outputArchive;
    const mockNode = {
        id: 'test-node',
        name: 'Compression',
        type: 'n8n-nodes-base.compression',
        typeVersion: 1.1,
        position: [0, 0],
        parameters: {},
    };
    const setParams = (outputFormat, binaryPropertyName = 'data') => {
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
            const params = {
                operation: 'compress',
                binaryPropertyName,
                outputFormat,
                fileName: 'archive.tar',
                binaryPropertyOutput: 'data',
            };
            return params[paramName];
        });
    };
    beforeEach(() => {
        compression = new Compression();
        mockExecuteFunctions = mockDeep();
        vi.clearAllMocks();
        mockExecuteFunctions.getNode.mockReturnValue(mockNode);
        mockExecuteFunctions.getInputData.mockReturnValue([{ json: { test: 'data' } }]);
        mockExecuteFunctions.continueOnFail.mockReturnValue(false);
        // each binary field maps to a distinct file name
        vi.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockImplementation((_i, propertyName) => ({
            data: 'base64data',
            mimeType: 'text/plain',
            fileName: propertyName === 'data2' ? 'b.txt' : 'a.txt',
            fileExtension: 'txt',
        }));
        vi.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer).mockResolvedValue(Buffer.from('hello'));
        vi.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockImplementation(async (buffer, fileName) => {
            outputArchive = buffer;
            return {
                data: buffer.toString('base64'),
                mimeType: 'application/x-tar',
                fileName: fileName ?? 'archive.tar',
                fileExtension: 'tar',
            };
        });
    });
    afterEach(() => {
        vi.resetAllMocks();
    });
    it('should compress to an uncompressed tar that round-trips', async () => {
        setParams('tar');
        const result = await compression.execute.call(mockExecuteFunctions);
        // not gzip-compressed
        expect(outputArchive[0] === 0x1f && outputArchive[1] === 0x8b).toBe(false);
        const extracted = await boundedUntar(outputArchive, 1024 * 1024, 100);
        expect(extracted['a.txt'].toString()).toBe('hello');
        expect(result[0][0].binary?.data).toBeDefined();
    });
    it('should compress to a gzip-compressed tar that round-trips', async () => {
        setParams('targz');
        await compression.execute.call(mockExecuteFunctions);
        // gzip magic bytes
        expect(outputArchive[0]).toBe(0x1f);
        expect(outputArchive[1]).toBe(0x8b);
        const extracted = await boundedUntar(outputArchive, 1024 * 1024, 100);
        expect(extracted['a.txt'].toString()).toBe('hello');
    });
    it('should bundle multiple input fields into a single tar archive', async () => {
        setParams('tar', 'data1,data2');
        await compression.execute.call(mockExecuteFunctions);
        const extracted = await boundedUntar(outputArchive, 1024 * 1024, 100);
        expect(Object.keys(extracted).sort()).toEqual(['a.txt', 'b.txt']);
    });
});
//# sourceMappingURL=Compress.test.js.map