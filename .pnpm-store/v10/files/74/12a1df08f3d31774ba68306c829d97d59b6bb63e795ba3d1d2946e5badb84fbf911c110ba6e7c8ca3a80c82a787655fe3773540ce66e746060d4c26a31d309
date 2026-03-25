# Google AI SDK for JavaScript

The Google AI JavaScript SDK is the easiest way for JavaScript developers to
build with the Gemini API. The Gemini API gives you access to Gemini
[models](https://ai.google.dev/models/gemini) created by
[Google DeepMind](https://deepmind.google/technologies/gemini/#introduction).
Gemini models are built from the ground up to be multimodal, so you can reason
seamlessly across text, images, and code.

> [!CAUTION] **Using the Google AI SDK for JavaScript directly from a
> client-side app is recommended for prototyping only.** If you plan to enable
> billing, we strongly recommend that you call the Google AI Gemini API only
> server-side to keep your API key safe. You risk potentially exposing your API
> key to malicious actors if you embed your API key directly in your JavaScript
> app or fetch it remotely at runtime.

## Get started with the Gemini API

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Login with your Google account.
3.  [Create an API key](https://aistudio.google.com/app/apikey). Note that in
    Europe the free tier is not available.
4.  Try the
    [Node.js quickstart](https://ai.google.dev/tutorials/node_quickstart)

## Usage example

See the [Node.js quickstart](https://ai.google.dev/tutorials/node_quickstart)
for complete code.

1.  Install the SDK package

```js
npm install @google/generative-ai
```

1.  Initialize the model

```js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
```

1.  Run a prompt

```js
const prompt = "Does this look store-bought or homemade?";
const image = {
  inlineData: {
    data: Buffer.from(fs.readFileSync("cookie.png")).toString("base64"),
    mimeType: "image/png",
  },
};

const result = await model.generateContent([prompt, image]);
console.log(result.response.text());
```

## Try out a sample app

This repository contains sample Node and web apps demonstrating how the SDK can
access and utilize the Gemini model for various use cases.

**To try out the sample Node app, follow these steps:**

1.  Check out this repository. \
    `git clone https://github.com/google/generative-ai-js`

1.  [Obtain an API key](https://makersuite.google.com/app/apikey) to use with
    the Google AI SDKs.

2.  cd into the `samples` folder and run `npm install`.

3.  Assign your API key to an environment variable: `export API_KEY=MY_API_KEY`.

4.  Open the sample file you're interested in. Example: `text_generation.js`.
    In the `runAll()` function, comment out any samples you don't want to run.

5.  Run the sample file. Example: `node text_generation.js`.

## Documentation

See the
[Gemini API Cookbook](https://github.com/google-gemini/gemini-api-cookbook/) or
[ai.google.dev](https://ai.google.dev) for complete documentation.

## Contributing

See [Contributing](/docs/contributing.md) for more information on contributing
to the Google AI JavaScript SDK.

## License

The contents of this repository are licensed under the
[Apache License, version 2.0](http://www.apache.org/licenses/LICENSE-2.0).