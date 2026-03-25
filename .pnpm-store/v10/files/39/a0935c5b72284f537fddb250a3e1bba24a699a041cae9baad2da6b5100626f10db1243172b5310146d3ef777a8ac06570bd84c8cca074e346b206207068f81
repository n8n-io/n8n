export type Fetch = typeof fetch

export interface Config {
  host: string
  fetch?: Fetch
  proxy?: boolean
  headers?: HeadersInit
}

// request types

export interface Options {
  numa: boolean
  num_ctx: number
  num_batch: number
  num_gpu: number
  main_gpu: number
  low_vram: boolean
  f16_kv: boolean
  logits_all: boolean
  vocab_only: boolean
  use_mmap: boolean
  use_mlock: boolean
  embedding_only: boolean
  num_thread: number

  // Runtime options
  num_keep: number
  seed: number
  num_predict: number
  top_k: number
  top_p: number
  tfs_z: number
  typical_p: number
  repeat_last_n: number
  temperature: number
  repeat_penalty: number
  presence_penalty: number
  frequency_penalty: number
  mirostat: number
  mirostat_tau: number
  mirostat_eta: number
  penalize_newline: boolean
  stop: string[]
}

export interface GenerateRequest {
  model: string
  prompt: string
  suffix?: string
  system?: string
  template?: string
  context?: number[]
  stream?: boolean
  raw?: boolean
  format?: string | object
  images?: Uint8Array[] | string[]
  keep_alive?: string | number // a number (seconds) or a string with a duration unit suffix ("300ms", "1.5h", "2h45m", etc)
  think?: boolean | 'high' | 'medium' | 'low'
  logprobs?: boolean
  top_logprobs?: number

  options?: Partial<Options>
}

export interface Message {
  role: string
  content: string
  thinking?: string
  images?: Uint8Array[] | string[]
  tool_calls?: ToolCall[]
  tool_name?: string
}

export interface ToolCall {
  function: {
    name: string;
    arguments: {
      [key: string]: any;
    };
  };
}

export interface Tool {
  type: string;
  function: {
    name?: string;
    description?: string;
    type?: string;
    parameters?: {
      type?: string;
      $defs?: any;
      items?: any;
      required?: string[];
      properties?: {
        [key: string]: {
          type?: string | string[];
          items?: any;
          description?: string;
          enum?: any[];
        };
      };
    };
  };
}

export interface ChatRequest {
  model: string
  messages?: Message[]
  stream?: boolean
  format?: string | object
  keep_alive?: string | number // a number (seconds) or a string with a duration unit suffix ("300ms", "1.5h", "2h45m", etc)
  tools?: Tool[]
  think?: boolean | 'high' | 'medium' | 'low'
  logprobs?: boolean
  top_logprobs?: number

  options?: Partial<Options>
}

export interface PullRequest {
  model: string
  insecure?: boolean
  stream?: boolean
}

export interface PushRequest {
  model: string
  insecure?: boolean
  stream?: boolean
}

export interface CreateRequest {
  model: string
  from?: string
  stream?: boolean
  quantize?: string
  template?: string
  license?: string | string[]
  system?: string
  parameters?: Record<string, unknown>
  messages?: Message[]
  adapters?: Record<string, string>
}

export interface DeleteRequest {
  model: string
}

export interface CopyRequest {
  source: string
  destination: string
}

export interface ShowRequest {
  model: string
  system?: string
  template?: string
  options?: Partial<Options>
}

export interface EmbedRequest {
  model: string
  input: string | string[]
  truncate?: boolean
  keep_alive?: string | number // a number (seconds) or a string with a duration unit suffix ("300ms", "1.5h", "2h45m", etc)
  dimensions?: number

  options?: Partial<Options>
}

export interface EmbeddingsRequest {
  model: string
  prompt: string
  keep_alive?: string | number // a number (seconds) or a string with a duration unit suffix ("300ms", "1.5h", "2h45m", etc)

  options?: Partial<Options>
}

// response types
export interface TokenLogprob {
  token: string
  logprob: number
}

export interface Logprob extends TokenLogprob {
  top_logprobs?: TokenLogprob[]
}

export interface GenerateResponse {
  model: string
  created_at: Date
  response: string
  thinking?: string
  done: boolean
  done_reason: string
  context: number[]
  total_duration: number
  load_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  eval_count: number
  eval_duration: number
  logprobs?: Logprob[]
}

export interface ChatResponse {
  model: string
  created_at: Date
  message: Message
  done: boolean
  done_reason: string
  total_duration: number
  load_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  eval_count: number
  eval_duration: number
  logprobs?: Logprob[]
}

export interface EmbedResponse {
  model: string
  embeddings: number[][]
  total_duration: number
  load_duration: number
  prompt_eval_count: number
}

export interface EmbeddingsResponse {
  embedding: number[]
}

export interface ProgressResponse {
  status: string
  digest: string
  total: number
  completed: number
}

export interface ModelResponse {
  name: string
  modified_at: Date
  model: string
  size: number
  digest: string
  details: ModelDetails
  expires_at: Date
  size_vram: number
}

export interface ModelDetails {
  parent_model: string
  format: string
  family: string
  families: string[]
  parameter_size: string
  quantization_level: string
}

export interface ShowResponse {
  license: string
  modelfile: string
  parameters: string
  template: string
  system: string
  details: ModelDetails
  messages: Message[]
  modified_at: Date
  model_info: Map<string, any>,
  capabilities: string[],
  projector_info?: Map<string, any>
}

export interface VersionResponse {
  version: string
}

export interface ListResponse {
  models: ModelResponse[]
}

export interface ErrorResponse {
  error: string
}

export interface StatusResponse {
  status: string
}

export interface WebSearchRequest {
  query: string
  maxResults?: number
}

export interface WebSearchResult {
  content: string
}

export interface WebSearchResponse {
  results: WebSearchResult[]
}

// Fetch types
export interface WebFetchRequest {
  url: string
}

export interface WebFetchResponse {
  title: string
  url: string
  content: string
  links: string[]
}
