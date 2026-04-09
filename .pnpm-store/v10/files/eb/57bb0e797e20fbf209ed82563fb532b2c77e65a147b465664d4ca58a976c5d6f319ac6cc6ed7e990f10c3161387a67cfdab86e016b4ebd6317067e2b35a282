# ⏳ js-tiktoken

tiktoken is a [BPE](https://en.wikipedia.org/wiki/Byte_pair_encoding) tokeniser for use with
OpenAI's models. This is a pure JS port of the original tiktoken library.

Install the library from NPM:

```
npm install js-tiktoken
```

## Lite

You can only load the ranks you need, which will significantly reduce the bundle size:

```typescript
import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";

const enc = new Tiktoken(o200k_base);
assert(enc.decode(enc.encode("hello world")) === "hello world");
```

Alternatively, encodings can be loaded dynamically from our CDN hosted on Cloudflare Pages.

```typescript
import { Tiktoken } from "js-tiktoken/lite";

const res = await fetch(`https://tiktoken.pages.dev/js/o200k_base.json`);
const o200k_base = await res.json();

const enc = new Tiktoken(o200k_base);
assert(enc.decode(enc.encode("hello world")) === "hello world");
```

## Full usage

If you need all the OpenAI tokenizers, you can import the entire library:

> [!CAUTION]
> This will include all the OpenAI tokenizers, which may significantly increase the bundle size. See

```typescript
import assert from "node:assert";
import { getEncoding, encodingForModel } from "js-tiktoken";

const enc = getEncoding("gpt2");
assert(enc.decode(enc.encode("hello world")) === "hello world");
```
