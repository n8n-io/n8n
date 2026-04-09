import {
  type ChatCompletionMessageParam,
  type ChatCompletionCreateParamsNonStreaming,
} from '../resources/chat/completions';
import { type RunnableFunctions, type BaseFunctionsArgs, RunnableTools } from './RunnableFunction';
import {
  AbstractChatCompletionRunner,
  AbstractChatCompletionRunnerEvents,
  RunnerOptions,
} from './AbstractChatCompletionRunner';
import { isAssistantMessage } from './chatCompletionUtils';
import OpenAI from '../index';
import { AutoParseableTool } from '../lib/parser';

export interface ChatCompletionRunnerEvents extends AbstractChatCompletionRunnerEvents {
  content: (content: string) => void;
}

export type ChatCompletionFunctionRunnerParams<FunctionsArgs extends BaseFunctionsArgs> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  'functions'
> & {
  functions: RunnableFunctions<FunctionsArgs>;
};

export type ChatCompletionToolRunnerParams<FunctionsArgs extends BaseFunctionsArgs> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  'tools'
> & {
  tools: RunnableTools<FunctionsArgs> | AutoParseableTool<any, true>[];
};

export class ChatCompletionRunner<ParsedT = null> extends AbstractChatCompletionRunner<
  ChatCompletionRunnerEvents,
  ParsedT
> {
  /** @deprecated - please use `runTools` instead. */
  static runFunctions(
    client: OpenAI,
    params: ChatCompletionFunctionRunnerParams<any[]>,
    options?: RunnerOptions,
  ): ChatCompletionRunner<null> {
    const runner = new ChatCompletionRunner();
    const opts = {
      ...options,
      headers: { ...options?.headers, 'X-Stainless-Helper-Method': 'runFunctions' },
    };
    runner._run(() => runner._runFunctions(client, params, opts));
    return runner;
  }

  static runTools<ParsedT>(
    client: OpenAI,
    params: ChatCompletionToolRunnerParams<any[]>,
    options?: RunnerOptions,
  ): ChatCompletionRunner<ParsedT> {
    const runner = new ChatCompletionRunner<ParsedT>();
    const opts = {
      ...options,
      headers: { ...options?.headers, 'X-Stainless-Helper-Method': 'runTools' },
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }

  override _addMessage(
    this: ChatCompletionRunner<ParsedT>,
    message: ChatCompletionMessageParam,
    emit: boolean = true,
  ) {
    super._addMessage(message, emit);
    if (isAssistantMessage(message) && message.content) {
      this._emit('content', message.content as string);
    }
  }
}
