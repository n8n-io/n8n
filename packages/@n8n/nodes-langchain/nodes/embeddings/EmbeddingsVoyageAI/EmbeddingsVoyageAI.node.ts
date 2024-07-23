import {
    NodeConnectionType,
    type IExecuteFunctions,
    type INodeType,
    type INodeTypeDescription,
    type SupplyData,
} from 'n8n-workflow';
import { VoyageAIEmbeddings } from 'langchain/embeddings/voyageai';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class EmbeddingsVoyageAI implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Embeddings Voyage AI',
        name: 'embeddingsVoyageAI',
        icon: 'file:voyage.svg',
        group: ['transform'],
        version: 1,
        description: 'Use Embeddings Voyage AI',
        defaults: {
            name: 'Embeddings Voyage AI',
        },
        inputs: [],
        outputs: [NodeConnectionType.AiEmbedding],
        outputNames: ['Embeddings'],
        credentials: [
            {
                name: 'voyageAIAPI',
                required: true,
            },
        ],
        requestDefaults: {
            ignoreHttpStatusErrors: true,
            baseURL: 'https://api.voyageai.com/v1',
        },
        properties: [
            getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    { name: 'voyage-2', value: 'voyage-2' },
                    { name: 'voyage-large-2', value: 'voyage-large-2' },
                    { name: 'voyage-finance-2', value: 'voyage-finance-2' },
                    { name: 'voyage-multilingual-2', value: 'voyage-multilingual-2' },
                    { name: 'voyage-law-2', value: 'voyage-law-2' },
                    { name: 'voyage-code-2', value: 'voyage-code-2' },
                ],
                default: 'voyage-large-2',
                description: 'The model to use for embedding',
            },
            {
                displayName: 'Options',
                name: 'options',
                placeholder: 'Add Option',
                description: 'Additional options to add',
                type: 'collection',
                default: {},
                options: [
                    {
                        displayName: 'Batch Size',
                        name: 'batchSize',
                        default: 512,
                        typeOptions: { maxValue: 2048 },
                        description: 'Maximum number of documents to send in each request',
                        type: 'number',
                    },
                    {
                        displayName: 'Strip New Lines',
                        name: 'stripNewLines',
                        default: true,
                        description: 'Whether to strip new lines from the input text',
                        type: 'boolean',
                    },
                ],
            },
        ],
    };

    async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
        const credentials = await this.getCredentials('voyageAIAPI');
        const modelName = this.getNodeParameter('model', itemIndex) as string;
        const options = this.getNodeParameter('options', itemIndex, {});

        const embeddings = new VoyageAIEmbeddings({
            apiKey: credentials.apiKey as string,
            model: modelName,
            ...options,
        });

        return {
            response: logWrapper(embeddings, this),
        };
    }
}
