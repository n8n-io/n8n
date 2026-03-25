import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManager, CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { Tool, ToolParams } from "@langchain/core/tools";
import { TextSplitter } from "@langchain/textsplitters";
import { EmbeddingsInterface } from "@langchain/core/embeddings";

//#region src/tools/webbrowser.d.ts
declare const parseInputs: (inputs: string) => [string, string];
declare const getText: (html: string, baseUrl: string, summary: boolean) => string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Headers = Record<string, any>;
/**
 * Configuration options for fetch requests, similar to axios config but for fetch
 */
interface RequestConfig extends Omit<RequestInit, "headers"> {
  withCredentials?: boolean;
}
/**
 * Defines the arguments that can be passed to the WebBrowser constructor.
 * It extends the ToolParams interface and includes properties for a
 * language model, embeddings, HTTP headers, an Axios configuration, a
 * callback manager, and a text splitter.
 */
interface WebBrowserArgs extends ToolParams {
  model: BaseLanguageModelInterface;
  embeddings: EmbeddingsInterface;
  headers?: Headers;
  requestConfig?: RequestConfig;
  /** @deprecated */
  callbackManager?: CallbackManager;
  textSplitter?: TextSplitter;
}
/**
 * A class designed to interact with web pages, either to extract
 * information from them or to summarize their content. It uses the native
 * fetch API to send HTTP requests and the cheerio library to parse the
 * returned HTML.
 * @example
 * ```typescript
 * const browser = new WebBrowser({
 *   model: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *   embeddings: new OpenAIEmbeddings({}),
 * });
 * const result = await browser.invoke("https:exampleurl.com");
 * ```
 */
declare class WebBrowser extends Tool {
  static lc_name(): string;
  get lc_namespace(): string[];
  private model;
  private embeddings;
  private headers;
  private requestConfig;
  private textSplitter;
  constructor({
    model,
    headers,
    embeddings,
    requestConfig,
    textSplitter
  }: WebBrowserArgs);
  /** @ignore */
  _call(inputs: string, runManager?: CallbackManagerForToolRun): Promise<string>;
  name: string;
  description: string;
}
//#endregion
export { RequestConfig, WebBrowser, WebBrowserArgs, getText, parseInputs };
//# sourceMappingURL=webbrowser.d.cts.map