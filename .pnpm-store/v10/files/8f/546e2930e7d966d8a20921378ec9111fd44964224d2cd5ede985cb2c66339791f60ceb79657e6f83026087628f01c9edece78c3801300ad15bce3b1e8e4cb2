import {
  parseJsonEventStream,
  ParseResult,
  withUserAgentSuffix,
  getRuntimeEnvironmentUserAgent,
} from '@ai-sdk/provider-utils';
import {
  UIMessageChunk,
  uiMessageChunkSchema,
} from '../ui-message-stream/ui-message-chunks';
import { consumeStream } from '../util/consume-stream';
import { processTextStream } from './process-text-stream';
import { VERSION } from '../version';

// use function to allow for mocking in tests:
const getOriginalFetch = () => fetch;

export async function callCompletionApi({
  api,
  prompt,
  credentials,
  headers,
  body,
  streamProtocol = 'data',
  setCompletion,
  setLoading,
  setError,
  setAbortController,
  onFinish,
  onError,
  fetch = getOriginalFetch(),
}: {
  api: string;
  prompt: string;
  credentials: RequestCredentials | undefined;
  headers: HeadersInit | undefined;
  body: Record<string, any>;
  streamProtocol: 'data' | 'text' | undefined;
  setCompletion: (completion: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | undefined) => void;
  setAbortController: (abortController: AbortController | null) => void;
  onFinish: ((prompt: string, completion: string) => void) | undefined;
  onError: ((error: Error) => void) | undefined;
  fetch: ReturnType<typeof getOriginalFetch> | undefined;
}) {
  try {
    setLoading(true);
    setError(undefined);

    const abortController = new AbortController();
    setAbortController(abortController);

    // Empty the completion immediately.
    setCompletion('');

    const response = await fetch(api, {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        ...body,
      }),
      credentials,
      headers: withUserAgentSuffix(
        {
          'Content-Type': 'application/json',
          ...headers,
        },
        `ai-sdk/${VERSION}`,
        getRuntimeEnvironmentUserAgent(),
      ),
      signal: abortController.signal,
    }).catch(err => {
      throw err;
    });

    if (!response.ok) {
      throw new Error(
        (await response.text()) ?? 'Failed to fetch the chat response.',
      );
    }

    if (!response.body) {
      throw new Error('The response body is empty.');
    }

    let result = '';

    switch (streamProtocol) {
      case 'text': {
        await processTextStream({
          stream: response.body,
          onTextPart: chunk => {
            result += chunk;
            setCompletion(result);
          },
        });
        break;
      }
      case 'data': {
        await consumeStream({
          stream: parseJsonEventStream({
            stream: response.body,
            schema: uiMessageChunkSchema,
          }).pipeThrough(
            new TransformStream<ParseResult<UIMessageChunk>, UIMessageChunk>({
              async transform(part) {
                if (!part.success) {
                  throw part.error;
                }

                const streamPart = part.value;
                if (streamPart.type === 'text-delta') {
                  result += streamPart.delta;
                  setCompletion(result);
                } else if (streamPart.type === 'error') {
                  throw new Error(streamPart.errorText);
                }
              },
            }),
          ),
          onError: error => {
            throw error;
          },
        });
        break;
      }
      default: {
        const exhaustiveCheck: never = streamProtocol;
        throw new Error(`Unknown stream protocol: ${exhaustiveCheck}`);
      }
    }

    if (onFinish) {
      onFinish(prompt, result);
    }

    setAbortController(null);
    return result;
  } catch (err) {
    // Ignore abort errors as they are expected.
    if ((err as any).name === 'AbortError') {
      setAbortController(null);
      return null;
    }

    if (err instanceof Error) {
      if (onError) {
        onError(err);
      }
    }

    setError(err as Error);
  } finally {
    setLoading(false);
  }
}
