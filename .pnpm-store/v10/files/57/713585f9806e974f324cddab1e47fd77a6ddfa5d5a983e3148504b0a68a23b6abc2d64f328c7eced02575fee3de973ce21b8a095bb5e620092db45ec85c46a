# Ollama JavaScript Library

The Ollama JavaScript library provides the easiest way to integrate your JavaScript project with [Ollama](https://github.com/jmorganca/ollama).

## Getting Started

```
npm i ollama
```

## Usage

```javascript
import ollama from 'ollama'

const response = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: 'Why is the sky blue?' }],
})
console.log(response.message.content)
```

### Browser Usage

To use the library without node, import the browser module.

```javascript
import ollama from 'ollama/browser'
```

## Streaming responses

Response streaming can be enabled by setting `stream: true`, modifying function calls to return an `AsyncGenerator` where each part is an object in the stream.

```javascript
import ollama from 'ollama'

const message = { role: 'user', content: 'Why is the sky blue?' }
const response = await ollama.chat({
  model: 'llama3.1',
  messages: [message],
  stream: true,
})
for await (const part of response) {
  process.stdout.write(part.message.content)
}
```

## Cloud Models

Run larger models by offloading to Ollama’s cloud while keeping your local workflow.

[You can see models currently available on Ollama's cloud here.](https://ollama.com/search?c=cloud)

### Run via local Ollama

1) Sign in (one-time):

```
ollama signin
```

2) Pull a cloud model:

```
ollama pull gpt-oss:120b-cloud
```

3) Use as usual (offloads automatically):

```javascript
import { Ollama } from 'ollama'

const ollama = new Ollama()
const response = await ollama.chat({
  model: 'gpt-oss:120b-cloud',
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  stream: true,
})
for await (const part of response) {
  process.stdout.write(part.message.content)
}
```

### Cloud API (ollama.com)

Access cloud models directly by pointing the client at `https://ollama.com`.

1) Create an [API key](https://ollama.com/settings/keys), then set the `OLLAMA_API_KEY` environment variable:

```
export OLLAMA_API_KEY=your_api_key
```

2) Generate a response via the cloud API:

```javascript
import { Ollama } from 'ollama'

const ollama = new Ollama({
  host: 'https://ollama.com',
  headers: { Authorization: 'Bearer ' + process.env.OLLAMA_API_KEY },
})

const response = await ollama.chat({
  model: 'gpt-oss:120b',
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  stream: true,
})

for await (const part of response) {
  process.stdout.write(part.message.content)
}
```

## API

The Ollama JavaScript library's API is designed around the [Ollama REST API](https://github.com/jmorganca/ollama/blob/main/docs/api.md)

### chat

```javascript
ollama.chat(request)
```

- `request` `<Object>`: The request object containing chat parameters.

  - `model` `<string>` The name of the model to use for the chat.
  - `messages` `<Message[]>`: Array of message objects representing the chat history.
    - `role` `<string>`: The role of the message sender ('user', 'system', or 'assistant').
    - `content` `<string>`: The content of the message.
    - `images` `<Uint8Array[] | string[]>`: (Optional) Images to be included in the message, either as Uint8Array or base64 encoded strings.
    - `tool_name` `<string>`: (Optional) Add the name of the tool that was executed to inform the model of the result 
  - `format` `<string>`: (Optional) Set the expected format of the response (`json`).
  - `stream` `<boolean>`: (Optional) When true an `AsyncGenerator` is returned.
  - `think` `<boolean | "high" | "medium" | "low">`: (Optional) Enable model thinking. Use `true`/`false` or specify a level. Requires model support.
  - `logprobs` `<boolean>`: (Optional) Return log probabilities for tokens. Requires model support.
  - `top_logprobs` `<number>`: (Optional) Number of top log probabilities to return per token when `logprobs` is enabled.
  - `keep_alive` `<string | number>`: (Optional) How long to keep the model loaded. A number (seconds) or a string with a duration unit suffix ("300ms", "1.5h", "2h45m", etc.)
  - `tools` `<Tool[]>`: (Optional) A list of tool calls the model may make.
  - `options` `<Options>`: (Optional) Options to configure the runtime.

- Returns: `<ChatResponse>`

### generate

```javascript
ollama.generate(request)
```

- `request` `<Object>`: The request object containing generate parameters.
  - `model` `<string>` The name of the model to use for the chat.
  - `prompt` `<string>`: The prompt to send to the model.
  - `suffix` `<string>`: (Optional) Suffix is the text that comes after the inserted text.
  - `system` `<string>`: (Optional) Override the model system prompt.
  - `template` `<string>`: (Optional) Override the model template.
  - `raw` `<boolean>`: (Optional) Bypass the prompt template and pass the prompt directly to the model.
  - `images` `<Uint8Array[] | string[]>`: (Optional) Images to be included, either as Uint8Array or base64 encoded strings.
  - `format` `<string>`: (Optional) Set the expected format of the response (`json`).
  - `stream` `<boolean>`: (Optional) When true an `AsyncGenerator` is returned.
  - `think` `<boolean | "high" | "medium" | "low">`: (Optional) Enable model thinking. Use `true`/`false` or specify a level. Requires model support.
  - `logprobs` `<boolean>`: (Optional) Return log probabilities for tokens. Requires model support.
  - `top_logprobs` `<number>`: (Optional) Number of top log probabilities to return per token when `logprobs` is enabled.
  - `keep_alive` `<string | number>`: (Optional) How long to keep the model loaded. A number (seconds) or a string with a duration unit suffix ("300ms", "1.5h", "2h45m", etc.)
  - `options` `<Options>`: (Optional) Options to configure the runtime.
- Returns: `<GenerateResponse>`

### pull

```javascript
ollama.pull(request)
```

- `request` `<Object>`: The request object containing pull parameters.
  - `model` `<string>` The name of the model to pull.
  - `insecure` `<boolean>`: (Optional) Pull from servers whose identity cannot be verified.
  - `stream` `<boolean>`: (Optional) When true an `AsyncGenerator` is returned.
- Returns: `<ProgressResponse>`

### push

```javascript
ollama.push(request)
```

- `request` `<Object>`: The request object containing push parameters.
  - `model` `<string>` The name of the model to push.
  - `insecure` `<boolean>`: (Optional) Push to servers whose identity cannot be verified.
  - `stream` `<boolean>`: (Optional) When true an `AsyncGenerator` is returned.
- Returns: `<ProgressResponse>`

### create

```javascript
ollama.create(request)
```

- `request` `<Object>`: The request object containing create parameters.
  - `model` `<string>` The name of the model to create.
  - `from` `<string>`: The base model to derive from.
  - `stream` `<boolean>`: (Optional) When true an `AsyncGenerator` is returned.
  - `quantize` `<string>`: Quanization precision level (`q8_0`, `q4_K_M`, etc.).
  - `template` `<string>`: (Optional) The prompt template to use with the model.
  - `license` `<string|string[]>`: (Optional) The license(s) associated with the model.
  - `system` `<string>`: (Optional) The system prompt for the model.
  - `parameters` `<Record<string, unknown>>`: (Optional) Additional model parameters as key-value pairs.
  - `messages` `<Message[]>`: (Optional) Initial chat messages for the model.
  - `adapters` `<Record<string, string>>`: (Optional) A key-value map of LoRA adapter configurations.
- Returns: `<ProgressResponse>`

Note: The `files` parameter is not currently supported in `ollama-js`.

### delete

```javascript
ollama.delete(request)
```

- `request` `<Object>`: The request object containing delete parameters.
  - `model` `<string>` The name of the model to delete.
- Returns: `<StatusResponse>`

### copy

```javascript
ollama.copy(request)
```

- `request` `<Object>`: The request object containing copy parameters.
  - `source` `<string>` The name of the model to copy from.
  - `destination` `<string>` The name of the model to copy to.
- Returns: `<StatusResponse>`

### list

```javascript
ollama.list()
```

- Returns: `<ListResponse>`

### show

```javascript
ollama.show(request)
```

- `request` `<Object>`: The request object containing show parameters.
  - `model` `<string>` The name of the model to show.
  - `system` `<string>`: (Optional) Override the model system prompt returned.
  - `template` `<string>`: (Optional) Override the model template returned.
  - `options` `<Options>`: (Optional) Options to configure the runtime.
- Returns: `<ShowResponse>`

### embed

```javascript
ollama.embed(request)
```

- `request` `<Object>`: The request object containing embedding parameters.
  - `model` `<string>` The name of the model used to generate the embeddings.
  - `input` `<string> | <string[]>`: The input used to generate the embeddings.
  - `truncate` `<boolean>`: (Optional) Truncate the input to fit the maximum context length supported by the model.
  - `keep_alive` `<string | number>`: (Optional) How long to keep the model loaded. A number (seconds) or a string with a duration unit suffix ("300ms", "1.5h", "2h45m", etc.)
  - `options` `<Options>`: (Optional) Options to configure the runtime.
- Returns: `<EmbedResponse>`

### web search
- Web search capability requires an Ollama account. [Sign up on ollama.com](https://ollama.com/signup) 
- Create an API key by visiting https://ollama.com/settings/keys
```javascript
ollama.webSearch(request)
```

- `request` `<Object>`: The search request parameters.
  - `query` `<string>`: The search query string.
  - `max_results` `<number>`: (Optional) Maximum results to return (default 5, max 10).
- Returns: `<SearchResponse>`

### web fetch

```javascript
ollama.webFetch(request)
```

- `request` `<Object>`: The fetch request parameters.
  - `url` `<string>`: The URL to fetch.
- Returns: `<FetchResponse>`

### ps

```javascript
ollama.ps()
```

- Returns: `<ListResponse>`

### version

```javascript
ollama.version()
```

- Returns: `<VersionResponse>`

### abort

```javascript
ollama.abort()
```

This method will abort **all** streamed generations currently running with the client instance.
If there is a need to manage streams with timeouts, it is recommended to have one Ollama client per stream.

All asynchronous threads listening to streams (typically the `for await (const part of response)`) will throw an `AbortError` exception. See [examples/abort/abort-all-requests.ts](examples/abort/abort-all-requests.ts) for an example.

## Custom client

A custom client can be created with the following fields:

- `host` `<string>`: (Optional) The Ollama host address. Default: `"http://127.0.0.1:11434"`.
- `fetch` `<Object>`: (Optional) The fetch library used to make requests to the Ollama host.
- `headers` `<Object>`: (Optional) Custom headers to include with every request.

```javascript
import { Ollama } from 'ollama'

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' })
const response = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: 'Why is the sky blue?' }],
})
```

## Custom Headers

You can set custom headers that will be included with every request:

```javascript
import { Ollama } from 'ollama'

const ollama = new Ollama({
  host: 'http://127.0.0.1:11434',
  headers: {
    Authorization: 'Bearer <api key>',
    'X-Custom-Header': 'custom-value',
    'User-Agent': 'MyApp/1.0',
  },
})
```

## Building

To build the project files run:

```sh
npm run build
```
