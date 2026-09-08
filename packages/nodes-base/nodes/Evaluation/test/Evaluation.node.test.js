import { mock } from 'vitest-mock-extended';
import { NodeOperationError, } from 'n8n-workflow';
import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { Evaluation } from '../Evaluation/Evaluation.node.ee';
describe('Test Evaluation', () => {
    const sheetName = 'Sheet5';
    const spreadsheetId = '1oqFpPgEPTGDw7BPkp1SfPXq3Cb3Hyr1SROtf-Ec4zvA';
    const mockDataTable = mock({
        getColumns: vi.fn(),
        addColumn: vi.fn(),
        updateRows: vi.fn(),
    });
    const mockExecuteFunctions = mock({
        helpers: { getDataTableProxy: vi.fn().mockResolvedValue(mockDataTable) },
    });
    beforeEach(() => {
        mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
        mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 4.6 });
        mockExecuteFunctions.getParentNodes.mockReturnValue([
            { type: 'n8n-nodes-base.evaluationTrigger', name: 'Evaluation' },
        ]);
        mockExecuteFunctions.evaluateExpression.mockReturnValue({
            row_number: 23,
            foo: 1,
            bar: 2,
            _rowsLeft: 2,
        });
    });
    afterEach(() => vi.clearAllMocks());
    describe('Test Evaluation Node for Set Output', () => {
        describe('Data tables', () => {
            test('should have data table methods defined', async () => {
                const evaluationNode = new Evaluation();
                expect(evaluationNode.methods.listSearch.dataTableSearch).toBeDefined();
                expect(evaluationNode.methods.loadOptions.getConditionsForColumn).toBeDefined();
                expect(evaluationNode.methods.loadOptions.getDataTableColumns).toBeDefined();
            });
            test('should throw error if output values is empty', async () => {
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        source: 'dataTable',
                        'outputs.values': [],
                        dataTableId: 'mockDataTableId',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                await expect(new Evaluation().execute.call(mockExecuteFunctions)).rejects.toThrow('No outputs to set');
                expect(mockDataTable.getColumns).not.toHaveBeenCalled();
                expect(mockDataTable.addColumn).not.toHaveBeenCalled();
                expect(mockDataTable.updateRows).not.toHaveBeenCalled();
            });
            test('should return empty when there is no parent evaluation trigger', async () => {
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        source: 'dataTable',
                        'outputs.values': [{ outputName: 'bob', outputValue: 'clam' }],
                        dataTableId: 'mockDataTableId',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                mockExecuteFunctions.getParentNodes.mockReturnValue([]);
                const result = await new Evaluation().execute.call(mockExecuteFunctions);
                expect(result).toEqual([[{ json: {} }]]);
                expect(mockDataTable.getColumns).not.toHaveBeenCalled();
                expect(mockDataTable.addColumn).not.toHaveBeenCalled();
                expect(mockDataTable.updateRows).not.toHaveBeenCalled();
            });
            test('should update rows and return input data with existing columns', async () => {
                mockExecuteFunctions.evaluateExpression.mockReturnValue({
                    row_id: 23,
                    row_number: 23,
                    foo: 1,
                    bar: 2,
                    _rowsLeft: 2,
                });
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        source: 'dataTable',
                        'outputs.values': [{ outputName: 'foo', outputValue: 'clam' }],
                        dataTableId: 'mockDataTableId',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                mockDataTable.getColumns.mockResolvedValue([
                    {
                        id: '1',
                        index: 0,
                        name: 'foo',
                        type: 'string',
                        dataTableId: 'mockDataTableId',
                    },
                ]);
                await new Evaluation().execute.call(mockExecuteFunctions);
                expect(mockDataTable.getColumns).toHaveBeenCalled();
                expect(mockDataTable.addColumn).not.toHaveBeenCalled();
                expect(mockDataTable.updateRows).toHaveBeenCalledWith({
                    filter: {
                        type: 'and',
                        filters: [{ columnName: 'id', condition: 'eq', value: 23 }],
                    },
                    data: { foo: 'clam' },
                });
            });
            test('should update rows and return input data with new columns', async () => {
                mockExecuteFunctions.evaluateExpression.mockReturnValue({
                    row_id: 23,
                    row_number: 23,
                    foo: 1,
                    bar: 2,
                    _rowsLeft: 2,
                });
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        source: 'dataTable',
                        'outputs.values': [
                            { outputName: 'foo', outputValue: 'clam' },
                            { outputName: 'bar', outputValue: 'baz' },
                        ],
                        dataTableId: 'mockDataTableId',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                mockDataTable.getColumns.mockResolvedValue([
                    {
                        id: '1',
                        index: 0,
                        name: 'foo',
                        type: 'string',
                        dataTableId: 'mockDataTableId',
                    },
                ]);
                await new Evaluation().execute.call(mockExecuteFunctions);
                expect(mockDataTable.getColumns).toHaveBeenCalled();
                expect(mockDataTable.addColumn).toHaveBeenCalledWith({
                    name: 'bar',
                    type: 'string',
                });
                expect(mockDataTable.updateRows).toHaveBeenCalledWith({
                    filter: {
                        type: 'and',
                        filters: [{ columnName: 'id', condition: 'eq', value: 23 }],
                    },
                    data: { foo: 'clam', bar: 'baz' },
                });
            });
        });
        describe('Google Sheets', () => {
            beforeEach(() => {
                vi.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
                    return { sheetId: 1, title: sheetName };
                });
                vi.spyOn(GoogleSheet.prototype, 'updateRows').mockImplementation(async () => {
                    return { sheetId: 1, title: sheetName };
                });
                vi.spyOn(GoogleSheet.prototype, 'batchUpdate').mockImplementation(async () => {
                    return { sheetId: 1, title: sheetName };
                });
            });
            test('credential test for googleApi should be in methods', async () => {
                const evaluationNode = new Evaluation();
                expect(evaluationNode.methods.credentialTest.googleApiCredentialTest).toBeDefined();
            });
            test('should throw error if output values is empty', async () => {
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        'outputs.values': [],
                        documentId: {
                            mode: 'id',
                            value: spreadsheetId,
                        },
                        sheetName,
                        sheetMode: 'id',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                await expect(new Evaluation().execute.call(mockExecuteFunctions)).rejects.toThrow('No outputs to set');
                expect(GoogleSheet.prototype.updateRows).not.toBeCalled();
                expect(GoogleSheet.prototype.batchUpdate).not.toBeCalled();
            });
            test('should update rows and return input data for existing headers', async () => {
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        source: 'googleSheets',
                        'outputs.values': [{ outputName: 'foo', outputValue: 'clam' }],
                        documentId: {
                            mode: 'id',
                            value: spreadsheetId,
                        },
                        sheetName,
                        sheetMode: 'id',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                await new Evaluation().execute.call(mockExecuteFunctions);
                expect(GoogleSheet.prototype.updateRows).toHaveBeenCalledWith(sheetName, [['foo', 'bar']], 'RAW', 1);
                expect(GoogleSheet.prototype.batchUpdate).toHaveBeenCalledWith([
                    {
                        range: 'Sheet5!A23',
                        values: [['clam']],
                    },
                ], 'RAW');
            });
            test('should return empty when there is no parent evaluation trigger', async () => {
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        source: 'googleSheets',
                        'outputs.values': [{ outputName: 'bob', outputValue: 'clam' }],
                        documentId: {
                            mode: 'id',
                            value: spreadsheetId,
                        },
                        sheetName,
                        sheetMode: 'id',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                mockExecuteFunctions.getParentNodes.mockReturnValue([]);
                const result = await new Evaluation().execute.call(mockExecuteFunctions);
                expect(result).toEqual([[{ json: {} }]]);
                expect(GoogleSheet.prototype.updateRows).not.toBeCalled();
                expect(GoogleSheet.prototype.batchUpdate).not.toBeCalled();
            });
            test('should update rows and return input data for new headers', async () => {
                mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                    const mockParams = {
                        source: 'googleSheets',
                        'outputs.values': [{ outputName: 'bob', outputValue: 'clam' }],
                        documentId: {
                            mode: 'id',
                            value: spreadsheetId,
                        },
                        sheetName,
                        sheetMode: 'id',
                        operation: 'setOutputs',
                    };
                    return (mockParams[key] ?? fallbackValue);
                });
                await new Evaluation().execute.call(mockExecuteFunctions);
                expect(GoogleSheet.prototype.updateRows).toHaveBeenCalledWith(sheetName, [['foo', 'bar', 'bob']], 'RAW', 1);
                expect(GoogleSheet.prototype.batchUpdate).toHaveBeenCalledWith([
                    {
                        range: 'Sheet5!C23',
                        values: [['clam']],
                    },
                ], 'RAW');
            });
        });
    });
    describe('Test Evaluation Node for Set Metrics', () => {
        const nodeTypes = mock();
        const evaluationMetricsNode = new Evaluation();
        let mockExecuteFunction;
        function getMockExecuteFunction(metrics) {
            return {
                getInputData: vi.fn().mockReturnValue([{}]),
                getNodeParameter: vi.fn((param, _) => {
                    if (param === 'metrics') {
                        return { assignments: metrics };
                    }
                    if (param === 'operation') {
                        return 'setMetrics';
                    }
                    if (param === 'metric') {
                        return 'customMetrics';
                    }
                    return param;
                }),
                getNode: vi.fn().mockReturnValue({
                    typeVersion: 1,
                }),
            };
        }
        beforeAll(() => {
            mockExecuteFunction = getMockExecuteFunction([
                {
                    id: '1',
                    name: 'Accuracy',
                    value: 0.95,
                    type: 'number',
                },
                {
                    id: '2',
                    name: 'Latency',
                    value: 100,
                    type: 'number',
                },
            ]);
            nodeTypes.getByName.mockReturnValue(evaluationMetricsNode);
            vi.clearAllMocks();
        });
        describe('execute', () => {
            it('should output the defined metrics', async () => {
                const result = await evaluationMetricsNode.execute.call(mockExecuteFunction);
                expect(result).toHaveLength(1);
                expect(result[0]).toHaveLength(1);
                const outputItem = result[0][0].json;
                expect(outputItem).toEqual({
                    Accuracy: 0.95,
                    Latency: 100,
                });
            });
            it('should handle no metrics defined', async () => {
                mockExecuteFunction = getMockExecuteFunction([]);
                const result = await evaluationMetricsNode.execute.call(mockExecuteFunction);
                expect(result).toHaveLength(1);
                expect(result[0]).toHaveLength(1);
                expect(result[0][0].json).toEqual({});
            });
            it('should convert string values to numbers', async () => {
                const mockExecuteWithStringValues = getMockExecuteFunction([
                    {
                        id: '1',
                        name: 'Accuracy',
                        value: '0.95',
                        type: 'number',
                    },
                    {
                        id: '2',
                        name: 'Latency',
                        value: '100',
                        type: 'number',
                    },
                ]);
                const result = await evaluationMetricsNode.execute.call(mockExecuteWithStringValues);
                expect(result).toHaveLength(1);
                expect(result[0]).toHaveLength(1);
                const outputItem = result[0][0].json;
                expect(outputItem).toEqual({
                    Accuracy: 0.95,
                    Latency: 100,
                });
            });
            it('should throw error for non-numeric string values', async () => {
                const mockExecuteWithInvalidValue = getMockExecuteFunction([
                    {
                        id: '1',
                        name: 'Accuracy',
                        value: 'not-a-number',
                        type: 'number',
                    },
                ]);
                await expect(evaluationMetricsNode.execute.call(mockExecuteWithInvalidValue)).rejects.toThrow(NodeOperationError);
            });
        });
    });
    describe('Test Evaluation Node for Check If Evaluating', () => {
        beforeEach(() => {
            mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
            mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 4.6 });
            mockExecuteFunctions.getNodeParameter.mockImplementation((key, _, fallbackValue) => {
                const mockParams = {
                    operation: 'checkIfEvaluating',
                };
                return (mockParams[key] ?? fallbackValue);
            });
        });
        afterEach(() => vi.clearAllMocks());
        test('should return output in normal branch if normal execution', async () => {
            mockExecuteFunctions.getParentNodes.mockReturnValue([]);
            const result = await new Evaluation().execute.call(mockExecuteFunctions);
            expect(result).toEqual([[], [{ json: {} }]]);
        });
        test('should return output in evaluation branch if evaluation execution', async () => {
            mockExecuteFunctions.getParentNodes.mockReturnValue([
                { type: 'n8n-nodes-base.evaluationTrigger', name: 'Evaluation' },
            ]);
            const result = await new Evaluation().execute.call(mockExecuteFunctions);
            expect(result).toEqual([[{ json: {} }], []]);
        });
    });
});
//# sourceMappingURL=Evaluation.node.test.js.map