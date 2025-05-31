/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
  NodeConnectionTypes,
  type INodeType,
  type INodeTypeDescription,
  type ISupplyDataFunctions,
  type SupplyData,
} from 'n8n-workflow';
import { getHttpProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { StraicoChatModel } from './StraicoChatModel';

interface OpenAICompatibleCredential {
  apiKey: string;
  url: string;
}

export class LmChatStraico implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Straico Chat Model',
    name: 'lmChatStraico',
    icon: { light: 'file:straico.svg', dark: 'file:straico.svg' },
    group: ['transform'],
    version: [1],
    description: 'Expose Straico chat-completion models for AI chains and the AI-Agent',
    defaults: { name: 'Straico Chat Model' },
    codex: {
      categories: ['AI'],
      subcategories: {
        AI: ['Language Models', 'Root Nodes'],
        'Language Models': ['Chat Models (Recommended)'],
      },
      resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/nlp-deutschland-de/n8n-docs/blob/main/docs/integrations/community-nodes/n8n-nodes-straico.md',
					},
				],
			},
    },
    inputs: [],
    outputs: [NodeConnectionTypes.AiLanguageModel],
    outputNames: ['Model'],
    credentials: [
      {
        name: 'straicoApi',
        required: true,
      },
    ],
    requestDefaults: {
      ignoreHttpStatusErrors: true,
      baseURL: '={{ $credentials?.url }}',
    },
    properties: [
      getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        required: true,
        default: 'anthropic/claude-3.5-sonnet',
        description: 'Choose the Straico model to generate the completion. <a href="https://documenter.getpostman.com/view/5900072/2s9YyzddrR">Learn more</a>.',
        typeOptions: {
          loadOptions: {
            routing: {
              request: {
                method: 'GET',
                url: '/models',
              },
              output: {
                postReceive: [
                  {
                    type: 'rootProperty',
                    properties: {
                      property: 'data',
                    },
                  },
                  {
                    type: 'setKeyValue',
                    properties: {
                      name: '={{$responseItem.model}}',
                      value: '={{$responseItem.model}}',
                    },
                  },
                  {
                    type: 'sort',
                    properties: {
                      key: 'name',
                    },
                  },
                ],
              },
            },
          },
        },
        routing: {
          send: { type: 'body', property: 'model' },
        },
      },
      {
        displayName: 'Options',
        name: 'options',
        placeholder: 'Add Option',
        type: 'collection',
        default: {},
        options: [
          {
            displayName: 'Temperature',
            name: 'temperature',
            type: 'number',
            default: 1,
            typeOptions: { minValue: 0, maxValue: 2 },
            description: 'Controls randomness of the model output.',
          },
          {
            displayName: 'Top P',
            name: 'top_p',
            type: 'number',
            default: 1,
            typeOptions: { minValue: 0, maxValue: 1 },
            description: 'Controls diversity via nucleus sampling.',
          },
          {
            displayName: 'Max Tokens',
            name: 'max_tokens',
            type: 'number',
            default: 1024,
            description: 'Maximum number of tokens to generate.',
          },
          {
            displayName: 'Presence Penalty',
            name: 'presence_penalty',
            type: 'number',
            default: 0,
            typeOptions: { minValue: -2, maxValue: 2 },
            description: 'Penalizes tokens based on their presence in the text.',
          },
          {
            displayName: 'Frequency Penalty',
            name: 'frequency_penalty',
            type: 'number',
            default: 0,
            typeOptions: { minValue: -2, maxValue: 2 },
            description: 'Penalizes tokens based on their frequency in the text.',
          },
          {
            displayName: 'Timeout (ms)',
            name: 'timeout',
            type: 'number',
            default: 60000,
            description: 'Maximum amount of time a request is allowed to take in milliseconds.',
          },
          {
            displayName: 'Max Retries',
            name: 'maxRetries',
            type: 'number',
            default: 2,
            description: 'Maximum number of retries to attempt.',
          },
        ],
      },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const credentials = await this.getCredentials<OpenAICompatibleCredential>('straicoApi');
    console.log('Credentials:', { apiKey: '***', url: credentials.url });

    const modelName = this.getNodeParameter('model', itemIndex) as string;
    console.log('Selected Model Name:', modelName); // Log the selected model

    const rawOptions = this.getNodeParameter('options', itemIndex, {}) as Record<string, any>;

    const options = {
      temperature: rawOptions.temperature,
      topP: rawOptions.top_p,
      maxTokens: rawOptions.max_tokens,
      presencePenalty: rawOptions.presence_penalty,
      frequencyPenalty: rawOptions.frequency_penalty,
      timeout: rawOptions.timeout ?? 60000,
      maxRetries: rawOptions.maxRetries ?? 2,
    };
    console.log('Options:', options);

    const model = new StraicoChatModel({
      apiKey: credentials.apiKey,
      baseURL: credentials.url || 'https://api.straico.com/v0',
      modelName, // Use the selected model from the dropdown
      ...options,
      callbacks: [new N8nLlmTracing(this)],
      onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
    });

    return { response: model };
  }
}
