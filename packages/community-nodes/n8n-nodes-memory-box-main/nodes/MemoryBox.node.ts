import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  NodeConnectionType,
} from 'n8n-workflow';

import {
  memoryBoxApiRequest,
  validateAndFormatMemory,
  extractItems,
} from '../src/generic/GenericFunctions';

import {
  bucketOperations,
  memoryOperations,
  memoryFields,
} from './MemoryBox.node.options';

export class MemoryBox implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Memory Box',
    name: 'memoryBox',
    icon: 'file:memory-box.svg',
    group: ['output', 'input'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Memory Box API to store and retrieve memories',
    defaults: {
      name: 'Memory Box',
    },
    inputs: ['main' as NodeConnectionType],
    outputs: ['main' as NodeConnectionType],
    credentials: [
      {
        name: 'memoryBoxApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Memory',
            value: 'memory',
          },
          {
            name: 'Bucket',
            value: 'bucket',
          },
        ],
        default: 'memory',
        description: 'Resource to consume',
      },

      // Memory operations
      ...memoryOperations,
      
      // Bucket operations
      ...bucketOperations,
      
      // Fields for specific operations
      ...memoryFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    
    let responseData;
    
    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'memory') {
          // Memory operations
          if (operation === 'store') {
            // Store a memory
            const text = this.getNodeParameter('text', i) as string;
            const bucketId = this.getNodeParameter('bucketId', i, null) as string | null;
            
            const formattedText = validateAndFormatMemory(text);
            
            const body: {
              text: string;
              bucketId?: string;
            } = {
              text: formattedText,
            };
            
            if (bucketId) {
              body.bucketId = bucketId;
            }
            
            responseData = await memoryBoxApiRequest.call(
              this,
              'POST',
              'memory',
              body,
            );
          }
          
          if (operation === 'search') {
            // Search memories
            const query = this.getNodeParameter('query', i) as string;
            const debug = this.getNodeParameter('debug', i, false) as boolean;
            
            const qs: {
              query: string;
              debug?: boolean;
            } = {
              query,
            };
            
            if (debug) {
              qs.debug = debug;
            }
            
            responseData = await memoryBoxApiRequest.call(
              this,
              'GET',
              'memory',
              {},
              qs,
            );
            
            responseData = extractItems(responseData);
          }
          
          if (operation === 'getAll') {
            // Get all memories
            const qs = {
              all: true,
            };
            
            responseData = await memoryBoxApiRequest.call(
              this,
              'GET',
              'memory',
              {},
              qs,
            );
            
            responseData = extractItems(responseData);
          }
          
          if (operation === 'getFromBucket') {
            // Get memories from bucket
            const bucketId = this.getNodeParameter('bucketId', i) as string;
            
            const qs = {
              bucketId,
            };
            
            responseData = await memoryBoxApiRequest.call(
              this,
              'GET',
              'memory',
              {},
              qs,
            );
            
            responseData = extractItems(responseData);
          }
        }
        
        if (resource === 'bucket') {
          if (operation === 'getAll') {
            // Get all buckets
            responseData = await memoryBoxApiRequest.call(
              this,
              'GET',
              'buckets',
            );
            
            responseData = extractItems(responseData);
          }
        }
        
        // Return the data
        if (Array.isArray(responseData)) {
          // Return as an array of items
          const executionData = responseData.map((item) => ({
            json: item,
          }));
          returnData.push(...executionData);
        } else {
          // Return as a single item
          returnData.push({ json: responseData });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }
        throw error;
      }
    }
    
    return [returnData];
  }
}
