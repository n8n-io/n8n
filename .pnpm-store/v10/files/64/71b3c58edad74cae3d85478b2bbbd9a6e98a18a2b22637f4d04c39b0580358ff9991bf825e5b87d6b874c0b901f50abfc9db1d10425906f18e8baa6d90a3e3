import { codeExecution } from './tool/code-execution';
import { enterpriseWebSearch } from './tool/enterprise-web-search';
import { fileSearch } from './tool/file-search';
import { googleMaps } from './tool/google-maps';
import { googleSearch } from './tool/google-search';
import { urlContext } from './tool/url-context';
import { vertexRagStore } from './tool/vertex-rag-store';

export const googleTools = {
  /**
   * Creates a Google search tool that gives Google direct access to real-time web content.
   * Must have name "google_search".
   */
  googleSearch,

  /**
   * Creates an Enterprise Web Search tool for grounding responses using a compliance-focused web index.
   * Designed for highly-regulated industries (finance, healthcare, public sector).
   * Does not log customer data and supports VPC service controls.
   * Must have name "enterprise_web_search".
   *
   * @note Only available on Vertex AI. Requires Gemini 2.0 or newer.
   *
   * @see https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/web-grounding-enterprise
   */
  enterpriseWebSearch,

  /**
   * Creates a Google Maps grounding tool that gives the model access to Google Maps data.
   * Must have name "google_maps".
   *
   * @see https://ai.google.dev/gemini-api/docs/maps-grounding
   * @see https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-maps
   */
  googleMaps,

  /**
   * Creates a URL context tool that gives Google direct access to real-time web content.
   * Must have name "url_context".
   */
  urlContext,

  /**
   * Enables Retrieval Augmented Generation (RAG) via the Gemini File Search tool.
   * Must have name "file_search".
   *
   * @param fileSearchStoreNames - Fully-qualified File Search store resource names.
   * @param metadataFilter - Optional filter expression to restrict the files that can be retrieved.
   * @param topK - Optional result limit for the number of chunks returned from File Search.
   *
   * @see https://ai.google.dev/gemini-api/docs/file-search
   */
  fileSearch,
  /**
   * A tool that enables the model to generate and run Python code.
   * Must have name "code_execution".
   *
   * @note Ensure the selected model supports Code Execution.
   * Multi-tool usage with the code execution tool is typically compatible with Gemini >=2 models.
   *
   * @see https://ai.google.dev/gemini-api/docs/code-execution (Google AI)
   * @see https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/code-execution-api (Vertex AI)
   */
  codeExecution,

  /**
   * Creates a Vertex RAG Store tool that enables the model to perform RAG searches against a Vertex RAG Store.
   * Must have name "vertex_rag_store".
   */
  vertexRagStore,
};
