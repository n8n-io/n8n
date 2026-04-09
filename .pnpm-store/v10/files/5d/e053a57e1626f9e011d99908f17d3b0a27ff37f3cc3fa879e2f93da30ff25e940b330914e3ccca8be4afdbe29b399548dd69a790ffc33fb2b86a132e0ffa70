# 🤗 Hugging Face Inference

A Typescript powered wrapper that provides a unified interface to run inference across multiple services for models hosted on the Hugging Face Hub:

1.  [Inference Providers](https://huggingface.co/docs/inference-providers/index): a streamlined, unified access to hundreds of machine learning models, powered by our serverless inference partners. This new approach builds on our previous Serverless Inference API, offering more models, improved performance, and greater reliability thanks to world-class providers. Refer to the [documentation](https://huggingface.co/docs/inference-providers/index#partners) for a list of supported providers.
2.  [Inference Endpoints](https://huggingface.co/docs/inference-endpoints/index): a product to easily deploy models to production. Inference is run by Hugging Face in a dedicated, fully managed infrastructure on a cloud provider of your choice.
3.  Local endpoints: you can also run inference with local inference servers like [llama.cpp](https://github.com/ggerganov/llama.cpp), [Ollama](https://ollama.com/), [vLLM](https://github.com/vllm-project/vllm), [LiteLLM](https://docs.litellm.ai/docs/simple_proxy), or [Text Generation Inference (TGI)](https://github.com/huggingface/text-generation-inference) by connecting the client to these local endpoints.


## Getting Started

### Install

#### Node

```console
npm install @huggingface/inference

pnpm add @huggingface/inference

yarn add @huggingface/inference
```

#### Deno

```ts
// esm.sh
import { InferenceClient } from "https://esm.sh/@huggingface/inference";
// or npm:
import { InferenceClient } from "npm:@huggingface/inference";
```

### Initialize

```typescript
import { InferenceClient } from '@huggingface/inference';

const hf = new InferenceClient('your access token');
```

❗**Important note:** Always pass an access token. Join [Hugging Face](https://huggingface.co/join) and then visit [access tokens](https://huggingface.co/settings/tokens) to generate your access token for **free**.

Your access token should be kept private. If you need to protect it in front-end applications, we suggest setting up a proxy server that stores the access token.

## Using Inference Providers

You can send inference requests to third-party providers with the inference client.

Currently, we support the following providers:
- [Fal.ai](https://fal.ai)
- [Featherless AI](https://featherless.ai)
- [Fireworks AI](https://fireworks.ai)
- [HF Inference](https://huggingface.co/docs/inference-providers/providers/hf-inference)
- [Hyperbolic](https://hyperbolic.xyz)
- [Nebius](https://studio.nebius.ai)
- [Novita](https://novita.ai)
- [Nscale](https://nscale.com)
- [OVHcloud](https://endpoints.ai.cloud.ovh.net/)
- [Public AI](https://publicai.co)
- [Replicate](https://replicate.com)
- [Sambanova](https://sambanova.ai)
- [Scaleway](https://www.scaleway.com/en/generative-apis/)
- [Clarifai](http://clarifai.com)
- [Together](https://together.xyz)
- [Baseten](https://baseten.co)
- [Blackforestlabs](https://blackforestlabs.ai)
- [Cohere](https://cohere.com)
- [Cerebras](https://cerebras.ai/)
- [Groq](https://groq.com)
- [Wavespeed.ai](https://wavespeed.ai/)
- [Z.ai](https://z.ai/)

To send requests to a third-party provider, you have to pass the `provider` parameter to the inference function. The default value of the `provider` parameter is "auto", which will select the first of the providers available for the model, sorted by your preferred order in https://hf.co/settings/inference-providers.

```ts
const accessToken = "hf_..."; // Either a HF access token, or an API key from the third-party provider (Replicate in this example)

const client = new InferenceClient(accessToken);
await client.textToImage({
  provider: "replicate",
  model:"black-forest-labs/Flux.1-dev",
  inputs: "A black forest cake"
})
```

You also have to make sure your request is authenticated with an access token.
When authenticated with a Hugging Face access token, the request is routed through https://huggingface.co.
When authenticated with a third-party provider key, the request is made directly against that provider's inference API.

Only a subset of models are supported when requesting third-party providers. You can check the list of supported models per pipeline tasks here:
- [Fal.ai supported models](https://huggingface.co/api/partners/fal-ai/models)
- [Featherless AI supported models](https://huggingface.co/api/partners/featherless-ai/models)
- [Fireworks AI supported models](https://huggingface.co/api/partners/fireworks-ai/models)
- [HF Inference supported models](https://huggingface.co/api/partners/hf-inference/models)
- [Hyperbolic supported models](https://huggingface.co/api/partners/hyperbolic/models)
- [Nebius supported models](https://huggingface.co/api/partners/nebius/models)
- [Nscale supported models](https://huggingface.co/api/partners/nscale/models)
- [OVHcloud supported models](https://huggingface.co/api/partners/ovhcloud/models)
- [Replicate supported models](https://huggingface.co/api/partners/replicate/models)
- [Sambanova supported models](https://huggingface.co/api/partners/sambanova/models)
- [Scaleway supported models](https://huggingface.co/api/partners/scaleway/models)
- [Together supported models](https://huggingface.co/api/partners/together/models)
- [Baseten supported models](https://huggingface.co/api/partners/baseten/models)
- [Clarifai supported models](https://huggingface.co/api/partners/clarifai/models)
- [Cohere supported models](https://huggingface.co/api/partners/cohere/models)
- [Cerebras supported models](https://huggingface.co/api/partners/cerebras/models)
- [Groq supported models](https://console.groq.com/docs/models)
- [Novita AI supported models](https://huggingface.co/api/partners/novita/models)
- [Wavespeed.ai supported models](https://huggingface.co/api/partners/wavespeed/models)
- [Z.ai supported models](https://huggingface.co/api/partners/zai-org/models)

❗**Important note:** To be compatible, the third-party API must adhere to the "standard" shape API we expect on HF model pages for each pipeline task type.
This is not an issue for LLMs as everyone converged on the OpenAI API anyways, but can be more tricky for other tasks like "text-to-image" or "automatic-speech-recognition" where there exists no standard API. Let us know if any help is needed or if we can make things easier for you!

👋**Want to add another provider?** Get in touch if you'd like to add support for another Inference provider, and/or request it on https://huggingface.co/spaces/huggingface/HuggingDiscussions/discussions/49

### Tree-shaking

You can import the functions you need directly from the module instead of using the `InferenceClient` class.

```ts
import { textGeneration } from "@huggingface/inference";

await textGeneration({
  accessToken: "hf_...",
  model: "model_or_endpoint",
  inputs: ...,
  parameters: ...
})
```

This will enable tree-shaking by your bundler.

### Error handling

The inference package provides specific error types to help you handle different error scenarios effectively.

#### Error Types

The package defines several error types that extend the base `Error` class:

- `InferenceClientError`: Base error class for all Hugging Face Inference errors
- `InferenceClientInputError`: Thrown when there are issues with input parameters
- `InferenceClientProviderApiError`: Thrown when there are API-level errors from providers
- `InferenceClientHubApiError`: Thrown when there are API-levels errors from the Hugging Face Hub
- `InferenceClientProviderOutputError`: Thrown when there are issues with providers' API responses format

### Example Usage

```typescript
import { InferenceClient } from "@huggingface/inference";
import {
  InferenceClientError,
  InferenceClientProviderApiError,
  InferenceClientProviderOutputError,
  InferenceClientHubApiError,
} from "@huggingface/inference";

const client = new InferenceClient();

try {
  const result = await client.textGeneration({
    model: "gpt2",
    inputs: "Hello, I'm a language model",
  });
} catch (error) {
  if (error instanceof InferenceClientProviderApiError) {
    // Handle API errors (e.g., rate limits, authentication issues)
    console.error("Provider API Error:", error.message);
    console.error("HTTP Request details:", error.request);
    console.error("HTTP Response details:", error.response);
  if (error instanceof InferenceClientHubApiError) {
    // Handle API errors (e.g., rate limits, authentication issues)
    console.error("Hub API Error:", error.message);
    console.error("HTTP Request details:", error.request);
    console.error("HTTP Response details:", error.response);
  } else if (error instanceof InferenceClientProviderOutputError) {
    // Handle malformed responses from providers
    console.error("Provider Output Error:", error.message);
  } else if (error instanceof InferenceClientInputError) {
    // Handle invalid input parameters
    console.error("Input Error:", error.message);
  } else {
    // Handle unexpected errors
    console.error("Unexpected error:", error);
  }
}

/// Catch all errors from @huggingface/inference
try {
  const result = await client.textGeneration({
    model: "gpt2",
    inputs: "Hello, I'm a language model",
  });
} catch (error) {
  if (error instanceof InferenceClientError) {
    // Handle errors from @huggingface/inference
    console.error("Error from InferenceClient:", error);
  } else {
    // Handle unexpected errors
    console.error("Unexpected error:", error);
  }
}
```

### Error Details

#### InferenceClientProviderApiError

This error occurs when there are issues with the API request when performing inference at the selected provider.

It has several properties:
- `message`: A descriptive error message
- `request`: Details about the failed request (URL, method, headers)
- `response`: Response details including status code and body

#### InferenceClientHubApiError

This error occurs when there are issues with the API request when requesting the Hugging Face Hub API.

It has several properties:
- `message`: A descriptive error message
- `request`: Details about the failed request (URL, method, headers)
- `response`: Response details including status code and body


#### InferenceClientProviderOutputError

This error occurs when a provider returns a response in an unexpected format.

#### InferenceClientInputError

This error occurs when input parameters are invalid or missing. The error message describes what's wrong with the input.


### Natural Language Processing

#### Text Generation

Generates text from an input prompt.

```typescript
await hf.textGeneration({
  model: 'mistralai/Mixtral-8x7B-v0.1',
  provider: "together",
  inputs: 'The answer to the universe is'
})

for await (const output of hf.textGenerationStream({
  model: "mistralai/Mixtral-8x7B-v0.1",
  provider: "together",
  inputs: 'repeat "one two three four"',
  parameters: { max_new_tokens: 250 }
})) {
  console.log(output.token.text, output.generated_text);
}
```

#### Chat Completion

Generate a model response from a list of messages comprising a conversation.

```typescript
// Non-streaming API
const out = await hf.chatCompletion({
  model: "Qwen/Qwen3-32B",
  provider: "cerebras",
  messages: [{ role: "user", content: "Hello, nice to meet you!" }],
  max_tokens: 512,
  temperature: 0.1,
});

// Streaming API
let out = "";
for await (const chunk of hf.chatCompletionStream({
  model: "Qwen/Qwen3-32B",
  provider: "cerebras",
  messages: [
    { role: "user", content: "Can you help me solve an equation?" },
  ],
  max_tokens: 512,
  temperature: 0.1,
})) {
  if (chunk.choices && chunk.choices.length > 0) {
    out += chunk.choices[0].delta.content;
  }
}
```
#### Feature Extraction

This task reads some text and outputs raw float values, that are usually consumed as part of a semantic database/semantic search.

```typescript
await hf.featureExtraction({
  model: "sentence-transformers/distilbert-base-nli-mean-tokens",
  inputs: "That is a happy person",
});
```

#### Fill Mask

Tries to fill in a hole with a missing word (token to be precise).

```typescript
await hf.fillMask({
  model: 'bert-base-uncased',
  inputs: '[MASK] world!'
})
```

#### Summarization

Summarizes longer text into shorter text. Be careful, some models have a maximum length of input.

```typescript
await hf.summarization({
  model: 'facebook/bart-large-cnn',
  inputs:
    'The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930.',
  parameters: {
    max_length: 100
  }
})
```

#### Question Answering

Answers questions based on the context you provide.

```typescript
await hf.questionAnswering({
  model: 'deepset/roberta-base-squad2',
  inputs: {
    question: 'What is the capital of France?',
    context: 'The capital of France is Paris.'
  }
})
```

#### Table Question Answering

```typescript
await hf.tableQuestionAnswering({
  model: 'google/tapas-base-finetuned-wtq',
  inputs: {
    query: 'How many stars does the transformers repository have?',
    table: {
      Repository: ['Transformers', 'Datasets', 'Tokenizers'],
      Stars: ['36542', '4512', '3934'],
      Contributors: ['651', '77', '34'],
      'Programming language': ['Python', 'Python', 'Rust, Python and NodeJS']
    }
  }
})
```

#### Text Classification

Often used for sentiment analysis, this method will assign labels to the given text along with a probability score of that label.

```typescript
await hf.textClassification({
  model: 'distilbert-base-uncased-finetuned-sst-2-english',
  inputs: 'I like you. I love you.'
})
```

#### Token Classification

Used for sentence parsing, either grammatical, or Named Entity Recognition (NER) to understand keywords contained within text.

```typescript
await hf.tokenClassification({
  model: 'dbmdz/bert-large-cased-finetuned-conll03-english',
  inputs: 'My name is Sarah Jessica Parker but you can call me Jessica'
})
```

#### Translation

Converts text from one language to another.

```typescript
await hf.translation({
  model: 't5-base',
  inputs: 'My name is Wolfgang and I live in Berlin'
})

await hf.translation({
  model: 'facebook/mbart-large-50-many-to-many-mmt',
  inputs: textToTranslate,
  parameters: {
  "src_lang": "en_XX",
  "tgt_lang": "fr_XX"
 }
})
```

#### Zero-Shot Classification

Checks how well an input text fits into a set of labels you provide.

```typescript
await hf.zeroShotClassification({
  model: 'facebook/bart-large-mnli',
  inputs: [
    'Hi, I recently bought a device from your company but it is not working as advertised and I would like to get reimbursed!'
  ],
  parameters: { candidate_labels: ['refund', 'legal', 'faq'] }
})
```

#### Sentence Similarity

Calculate the semantic similarity between one text and a list of other sentences.

```typescript
await hf.sentenceSimilarity({
  model: 'sentence-transformers/paraphrase-xlm-r-multilingual-v1',
  inputs: {
    source_sentence: 'That is a happy person',
    sentences: [
      'That is a happy dog',
      'That is a very happy person',
      'Today is a sunny day'
    ]
  }
})
```

### Audio

#### Automatic Speech Recognition

Transcribes speech from an audio file.

[Demo](https://huggingface.co/spaces/huggingfacejs/speech-recognition-vue)

```typescript
await hf.automaticSpeechRecognition({
  model: 'facebook/wav2vec2-large-960h-lv60-self',
  data: readFileSync('test/sample1.flac')
})
```

#### Audio Classification

Assigns labels to the given audio along with a probability score of that label.

[Demo](https://huggingface.co/spaces/huggingfacejs/audio-classification-vue)

```typescript
await hf.audioClassification({
  model: 'superb/hubert-large-superb-er',
  data: readFileSync('test/sample1.flac')
})
```

#### Text To Speech

Generates natural-sounding speech from text input.

[Interactive tutorial](https://scrimba.com/scrim/co8da4d23b49b648f77f4848a?pl=pkVnrP7uP)

```typescript
await hf.textToSpeech({
  model: 'espnet/kan-bayashi_ljspeech_vits',
  inputs: 'Hello world!'
})
```

#### Audio To Audio

Outputs one or multiple generated audios from an input audio, commonly used for speech enhancement and source separation.

```typescript
await hf.audioToAudio({
  model: 'speechbrain/sepformer-wham',
  data: readFileSync('test/sample1.flac')
})
```

### Computer Vision

#### Image Classification

Assigns labels to a given image along with a probability score of that label.

[Demo](https://huggingface.co/spaces/huggingfacejs/image-classification-vue)

```typescript
await hf.imageClassification({
  data: readFileSync('test/cheetah.png'),
  model: 'google/vit-base-patch16-224'
})
```

#### Object Detection

Detects objects within an image and returns labels with corresponding bounding boxes and probability scores.

[Demo](https://huggingface.co/spaces/huggingfacejs/object-detection-vue)

```typescript
await hf.objectDetection({
  data: readFileSync('test/cats.png'),
  model: 'facebook/detr-resnet-50'
})
```

#### Image Segmentation

Detects segments within an image and returns labels with corresponding bounding boxes and probability scores.

```typescript
await hf.imageSegmentation({
  data: readFileSync('test/cats.png'),
  model: 'facebook/detr-resnet-50-panoptic'
})
```

#### Image To Text

Outputs text from a given image, commonly used for captioning or optical character recognition.

```typescript
await hf.imageToText({
  data: readFileSync('test/cats.png'),
  model: 'nlpconnect/vit-gpt2-image-captioning'
})
```

#### Text To Image

Creates an image from a text prompt.

[Demo](https://huggingface.co/spaces/huggingfacejs/image-to-text)

```typescript
await hf.textToImage({
  model: 'black-forest-labs/FLUX.1-dev',
  inputs: 'a picture of a green bird'
})
```

#### Image To Image

Image-to-image is the task of transforming a source image to match the characteristics of a target image or a target image domain.

[Interactive tutorial](https://scrimba.com/scrim/co4834bf9a91cc81cfab07969?pl=pkVnrP7uP)

```typescript
await hf.imageToImage({
  inputs: new Blob([readFileSync("test/stormtrooper_depth.png")]),
  parameters: {
    prompt: "elmo's lecture",
  },
  model: "lllyasviel/sd-controlnet-depth",
});
```

#### Zero Shot Image Classification

Checks how well an input image fits into a set of labels you provide.

```typescript
await hf.zeroShotImageClassification({
  model: 'openai/clip-vit-large-patch14-336',
  inputs: {
    image: await (await fetch('https://placekitten.com/300/300')).blob()
  },
  parameters: {
    candidate_labels: ['cat', 'dog']
  }
})
```

### Multimodal


#### Visual Question Answering

Visual Question Answering is the task of answering open-ended questions based on an image. They output natural language responses to natural language questions.

[Demo](https://huggingface.co/spaces/huggingfacejs/doc-vis-qa)

```typescript
await hf.visualQuestionAnswering({
  model: 'dandelin/vilt-b32-finetuned-vqa',
  inputs: {
    question: 'How many cats are lying down?',
    image: await (await fetch('https://placekitten.com/300/300')).blob()
  }
})
```

#### Document Question Answering

Document question answering models take a (document, question) pair as input and return an answer in natural language.

[Demo](https://huggingface.co/spaces/huggingfacejs/doc-vis-qa)

```typescript
await hf.documentQuestionAnswering({
  model: 'impira/layoutlm-document-qa',
  inputs: {
    question: 'Invoice number?',
    image: await (await fetch('https://huggingface.co/spaces/impira/docquery/resolve/2359223c1837a7587402bda0f2643382a6eefeab/invoice.png')).blob(),
  }
})
```

### Tabular

#### Tabular Regression

Tabular regression is the task of predicting a numerical value given a set of attributes.

```typescript
await hf.tabularRegression({
  model: "scikit-learn/Fish-Weight",
  inputs: {
    data: {
      "Height": ["11.52", "12.48", "12.3778"],
      "Length1": ["23.2", "24", "23.9"],
      "Length2": ["25.4", "26.3", "26.5"],
      "Length3": ["30", "31.2", "31.1"],
      "Species": ["Bream", "Bream", "Bream"],
      "Width": ["4.02", "4.3056", "4.6961"]
    },
  },
})
```

#### Tabular Classification

Tabular classification is the task of classifying a target category (a group) based on set of attributes.

```typescript
await hf.tabularClassification({
  model: "vvmnnnkv/wine-quality",
  inputs: {
    data: {
      "fixed_acidity": ["7.4", "7.8", "10.3"],
      "volatile_acidity": ["0.7", "0.88", "0.32"],
      "citric_acid": ["0", "0", "0.45"],
      "residual_sugar": ["1.9", "2.6", "6.4"],
      "chlorides": ["0.076", "0.098", "0.073"],
      "free_sulfur_dioxide": ["11", "25", "5"],
      "total_sulfur_dioxide": ["34", "67", "13"],
      "density": ["0.9978", "0.9968", "0.9976"],
      "pH": ["3.51", "3.2", "3.23"],
      "sulphates": ["0.56", "0.68", "0.82"],
      "alcohol": ["9.4", "9.8", "12.6"]
    },
  },
})
```

You can use any Chat Completion API-compatible provider with the `chatCompletion` method.

```typescript
// Chat Completion Example
const MISTRAL_KEY = process.env.MISTRAL_KEY;
const hf = new InferenceClient(MISTRAL_KEY, {
  endpointUrl: "https://api.mistral.ai",
});
const stream = hf.chatCompletionStream({
  model: "mistral-tiny",
  messages: [{ role: "user", content: "Complete the equation one + one = , just the answer" }],
});
let out = "";
for await (const chunk of stream) {
  if (chunk.choices && chunk.choices.length > 0) {
    out += chunk.choices[0].delta.content;
    console.log(out);
  }
}
```

## Using Inference Endpoints

The examples we saw above use inference providers. While these prove to be very useful for prototyping
and testing things quickly. Once you're ready to deploy your model to production, you'll need to use a dedicated infrastructure. That's where [Inference Endpoints](https://huggingface.co/docs/inference-endpoints/index) comes into play. It allows you to deploy any model and expose it as a private API. Once deployed, you'll get a URL that you can connect to:

```typescript
import { InferenceClient } from '@huggingface/inference';

const hf = new InferenceClient("hf_xxxxxxxxxxxxxx", {
	endpointUrl: "https://j3z5luu0ooo76jnl.us-east-1.aws.endpoints.huggingface.cloud/v1/",
});

const response = await hf.chatCompletion({
	messages: [
		{
			role: "user",
			content: "What is the capital of France?",
		},
	],
});

console.log(response.choices[0].message.content);
```

By default, all calls to the inference endpoint will wait until the model is loaded. When [scaling to 0](https://huggingface.co/docs/inference-endpoints/en/autoscaling#scaling-to-0)
is enabled on the endpoint, this can result in non-trivial waiting time. If you'd rather disable this behavior and handle the endpoint's returned 500 HTTP errors yourself, you can do so like so:

```typescript
const hf = new InferenceClient("hf_xxxxxxxxxxxxxx", {
	endpointUrl: "https://j3z5luu0ooo76jnl.us-east-1.aws.endpoints.huggingface.cloud/v1/",
});

const response = await hf.chatCompletion(
	{
		messages: [
			{
				role: "user",
				content: "What is the capital of France?",
			},
		],
	},
	{
		retry_on_error: false,
	}
);
```
## Using local endpoints

You can use `InferenceClient` to run chat completion with local inference servers (llama.cpp, vllm, litellm server, TGI, mlx, etc.) running on your own machine. The API should be OpenAI API-compatible.

```typescript
import { InferenceClient } from '@huggingface/inference';

const hf = new InferenceClient(undefined, {
	endpointUrl: "http://localhost:8080",
});

const response = await hf.chatCompletion({
	messages: [
		{
			role: "user",
			content: "What is the capital of France?",
		},
	],
});

console.log(response.choices[0].message.content);
```

<Tip>

Similarily to the OpenAI JS client, `InferenceClient` can be used to run Chat Completion inference with any OpenAI REST API-compatible endpoint.

</Tip>

## Running tests

```console
HF_TOKEN="your access token" pnpm run test
```

## Finding appropriate models

We have an informative documentation project called [Tasks](https://huggingface.co/tasks) to list available models for each task and explain how each task works in detail.

It also contains demos, example outputs, and other resources should you want to dig deeper into the ML side of things.

## Dependencies

- `@huggingface/tasks` : Typings only
