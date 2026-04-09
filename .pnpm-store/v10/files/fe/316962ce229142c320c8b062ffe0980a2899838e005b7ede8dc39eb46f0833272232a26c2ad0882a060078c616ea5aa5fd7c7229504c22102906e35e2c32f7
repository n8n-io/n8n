# Supported JavaScript runtimes

This SDK is intended to be used in JavaScript runtimes that support ECMAScript 2020 or newer. The SDK uses the following features:

- [Web Fetch API][web-fetch]
- [Web Streams API][web-streams] and in particular `ReadableStream`
- [Async iterables][async-iter] using `Symbol.asyncIterator`

[web-fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[web-streams]: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
[async-iter]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols

Runtime environments that are explicitly supported are:

- Evergreen browsers which include: Chrome, Safari, Edge, Firefox
- Node.js active and maintenance LTS releases
  - Currently, this is v18 and v20
- Bun v1 and above
- Deno v1.39
  - Note that Deno does not currently have native support for streaming file uploads backed by the filesystem ([issue link][deno-file-streaming])

[deno-file-streaming]: https://github.com/denoland/deno/issues/11018

## Recommended TypeScript compiler options

The following `tsconfig.json` options are recommended for projects using this
SDK in order to get static type support for features like async iterables,
streams and `fetch`-related APIs ([`for await...of`][for-await-of],
[`AbortSignal`][abort-signal], [`Request`][request], [`Response`][response] and
so on):

[for-await-of]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
[abort-signal]: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
[request]: https://developer.mozilla.org/en-US/docs/Web/API/Request
[response]: https://developer.mozilla.org/en-US/docs/Web/API/Response

```jsonc
{
  "compilerOptions": {
    "target": "es2020", // or higher
    "lib": ["es2020", "dom", "dom.iterable"]
  }
}
```

While `target` can be set to older ECMAScript versions, it may result in extra,
unnecessary compatibility code being generated if you are not targeting old
runtimes.
