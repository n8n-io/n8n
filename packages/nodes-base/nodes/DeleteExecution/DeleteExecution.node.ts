import {
    INodeExecutionData,
    IExecuteFunctions,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

export class DeleteExecution implements INodeType {
    description: INodeTypeDescription = {
        // Basic node details will go here
        displayName: 'DeleteExcution',
        name: 'DeleteExcution',
        description: 'delete current excution record.',
        group: ['organization'],
        version: 1,
        defaults: {
            name: 'DeleteExcution',
        },
        inputs: ['main'],
        outputs: ['main'],
        icon: 'file:deleteExecution.svg',
        properties: [
            // Resources and operations will go here
        ],
    };
    // The execute method will go here
    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        this.deleteExecution()
        return [[]]
    }
    
}
