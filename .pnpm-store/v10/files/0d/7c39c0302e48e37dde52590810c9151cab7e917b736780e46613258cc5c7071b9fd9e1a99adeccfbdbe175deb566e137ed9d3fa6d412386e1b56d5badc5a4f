# ⏳ js-tiktoken

tiktoken is a [BPE](https://en.wikipedia.org/wiki/Byte_pair_encoding) tokeniser for use with
OpenAI's models. This is a pure JS port of the original tiktoken library.

Install the library from NPM:

```
npm install js-tiktoken
```

## Usage

Basic usage follows, which includes all the OpenAI encoders and ranks:

```typescript
import assert from "node:assert";
import { getEncoding, encodingForModel } from "js-tiktoken";

const enc = getEncoding("gpt2");
assert(enc.decode(enc.encode("hello world")) === "hello world");
```
