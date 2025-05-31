import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
import { getHttpProxyAgent } from '@utils/httpProxyAgent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Tool } from '@langchain/core/tools';

interface StraicoChatModelParams extends BaseChatModelCallOptions {
  apiKey: string;
  baseURL: string;
  modelName: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  timeout?: number;
  maxRetries?: number;
  callbacks?: any[];
  onFailedAttempt?: (error: Error) => void;
}

interface NodeRequestInit extends RequestInit {
  agent?: HttpsProxyAgent<string> | undefined;
}

export class StraicoChatModel extends BaseChatModel {
  apiKey: string;
  baseURL: string;
  modelName: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  timeout: number;
  maxRetries: number;
  boundTools: Tool[] = [];
  callbacks?: any[];
  onFailedAttempt?: (error: Error) => void;

  constructor(params: StraicoChatModelParams) {
    super(params);
    this.apiKey = params.apiKey;
    this.baseURL = params.baseURL || 'https://api.straico.com/v0';
    this.modelName = params.modelName;
    this.temperature = params.temperature;
    this.topP = params.topP;
    this.maxTokens = params.maxTokens;
    this.presencePenalty = params.presencePenalty;
    this.frequencyPenalty = params.frequencyPenalty;
    this.timeout = params.timeout ?? 60000;
    this.maxRetries = params.maxRetries ?? 2;
    this.callbacks = params.callbacks;
    this.onFailedAttempt = params.onFailedAttempt;
    console.log('Model Initialized:', { apiKey: '***', baseURL: this.baseURL, modelName: this.modelName });
  }

  async _generate(messages: BaseMessage[], options?: BaseChatModelCallOptions): Promise<ChatResult> {
    console.log('Generating with messages:', messages.map(m => m.content));

    // Add a system prompt to provide context
    const systemPrompt = new SystemMessage({
      content: "You are a friendly assistant. Respond to the user's message in a conversational tone.",
    });
    const allMessages = [systemPrompt, ...messages];

    const url = `${this.baseURL}/prompt/completion`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const messageContent = allMessages
      .map((msg) => {
        if (msg._getType() === 'human') return msg.content;
        if (msg._getType() === 'ai') return `Assistant: ${msg.content}`;
        if (msg._getType() === 'system') return `System: ${msg.content}`;
        return '';
      })
      .filter((content) => content)
      .join('\n');

    let toolCalls: any[] = [];
    let prompt = messageContent;

    if (this.boundTools.length > 0) {
      const toolsSchema = JSON.stringify(
        this.boundTools.map((tool: Tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.schema,
        })),
        null,
        2,
      );

      prompt = `
${messageContent}

You are an AI assistant capable of calling tools. If the user request requires a tool, respond with a JSON object containing:
- tool: The name of the tool to call
- arguments: The arguments for the tool
- content: Any additional text response (optional)

Available tools:
${toolsSchema}

Return the response in JSON format.
`;
    }

    const body = {
      smart_llm_selector: this.modelName.includes('claude') ? 'quality' : 'speed',
      message: prompt,
      replace_failed_models: true,
      ...(this.temperature && { temperature: this.temperature }),
      ...(this.topP && { top_p: this.topP }),
      ...(this.maxTokens && { max_tokens: this.maxTokens }),
      ...(this.presencePenalty && { presence_penalty: this.presencePenalty }),
      ...(this.frequencyPenalty && { frequency_penalty: this.frequencyPenalty }),
      response_format: this.boundTools.length > 0 ? 'json' : 'text',
    };

    let attempts = 0;
    while (attempts <= this.maxRetries) {
      try {
        const requestOptions: NodeRequestInit = {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          agent: getHttpProxyAgent(),
          signal: AbortSignal.timeout(this.timeout),
        };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        console.log('Straico API Response:', data);

        // Adjusted parsing for nested response structure
        let completion = '';
        if (data?.data?.completion?.choices?.length > 0) {
          const choice = data.data.completion.choices[0];
          completion = choice.message?.content || choice.text || '';
        } else if (data?.completion || data?.message || data?.text || data?.response || data?.result) {
          completion = data.completion || data.message || data.text || data.response || data.result || '';
        } else if (typeof data === 'string') {
          completion = data;
        }

        if (this.boundTools.length > 0) {
          try {
            const parsed = JSON.parse(completion);
            if (parsed.tool && parsed.arguments) {
              toolCalls = [
                {
                  name: parsed.tool,
                  args: parsed.arguments,
                },
              ];
              completion = parsed.content || '';
            }
          } catch (e) {
            console.log('Failed to parse tool call response as JSON:', e);
          }
        }

        console.log('Generated Completion:', completion);
        return {
          generations: [
            {
              text: completion,
              message: new AIMessage({
                content: completion,
                additional_kwargs: toolCalls.length > 0 ? { tool_calls: toolCalls } : undefined,
              }),
            },
          ],
        };
      } catch (error) {
        console.log('Error in _generate:', error.message);
        if (this.onFailedAttempt) this.onFailedAttempt(error);
        attempts++;
        if (attempts > this.maxRetries) {
          throw new Error(`Failed after ${this.maxRetries} retries: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    throw new Error('Unexpected error in request handling');
  }

  bindTools(tools: Tool[]): this {
    this.boundTools = tools;
    return this as this;
  }

  _llmType(): string {
    return 'straico';
  }
}