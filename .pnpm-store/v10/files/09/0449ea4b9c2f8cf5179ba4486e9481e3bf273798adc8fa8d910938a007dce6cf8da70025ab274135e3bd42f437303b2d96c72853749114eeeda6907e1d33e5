/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
import { MultipartBody } from './MultipartBody';
import { type RequestOptions } from '../core';
import { type Shims } from './registry';

export function getRuntime({ manuallyImported }: { manuallyImported?: boolean } = {}): Shims {
  const recommendation =
    manuallyImported ?
      `You may need to use polyfills`
    : `Add one of these imports before your first \`import … from 'openai'\`:
- \`import 'openai/shims/node'\` (if you're running on Node)
- \`import 'openai/shims/web'\` (otherwise)
`;

  let _fetch, _Request, _Response, _Headers;
  try {
    // @ts-ignore
    _fetch = fetch;
    // @ts-ignore
    _Request = Request;
    // @ts-ignore
    _Response = Response;
    // @ts-ignore
    _Headers = Headers;
  } catch (error) {
    throw new Error(
      `this environment is missing the following Web Fetch API type: ${
        (error as any).message
      }. ${recommendation}`,
    );
  }

  return {
    kind: 'web',
    fetch: _fetch,
    Request: _Request,
    Response: _Response,
    Headers: _Headers,
    FormData:
      // @ts-ignore
      typeof FormData !== 'undefined' ? FormData : (
        class FormData {
          // @ts-ignore
          constructor() {
            throw new Error(
              `file uploads aren't supported in this environment yet as 'FormData' is undefined. ${recommendation}`,
            );
          }
        }
      ),
    Blob:
      typeof Blob !== 'undefined' ? Blob : (
        class Blob {
          constructor() {
            throw new Error(
              `file uploads aren't supported in this environment yet as 'Blob' is undefined. ${recommendation}`,
            );
          }
        }
      ),
    File:
      // @ts-ignore
      typeof File !== 'undefined' ? File : (
        class File {
          // @ts-ignore
          constructor() {
            throw new Error(
              `file uploads aren't supported in this environment yet as 'File' is undefined. ${recommendation}`,
            );
          }
        }
      ),
    ReadableStream:
      // @ts-ignore
      typeof ReadableStream !== 'undefined' ? ReadableStream : (
        class ReadableStream {
          // @ts-ignore
          constructor() {
            throw new Error(
              `streaming isn't supported in this environment yet as 'ReadableStream' is undefined. ${recommendation}`,
            );
          }
        }
      ),
    getMultipartRequestOptions: async <T = Record<string, unknown>>(
      // @ts-ignore
      form: FormData,
      opts: RequestOptions<T>,
    ): Promise<RequestOptions<T>> => ({
      ...opts,
      body: new MultipartBody(form) as any,
    }),
    getDefaultAgent: (url: string) => undefined,
    fileFromPath: () => {
      throw new Error(
        'The `fileFromPath` function is only supported in Node. See the README for more details: https://www.github.com/openai/openai-node#file-uploads',
      );
    },
    isFsReadStream: (value: any) => false,
  };
}
