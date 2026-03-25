# Behavior of [Structured Clone]

[Structured clone] is JavaScript’s algorithm to create “deep copies” of values. It is used for `postMessage()` and therefore is used extensively under the hood with Comlink. By default, every function parameter and function return value is structured cloned. Here is a table of how the structured clone algorithm handles different kinds of values. Or to phrase it differently: If you pass a value from the left side as a parameter into a proxy’d function, the actual function code will get what is listed on the right side.

| Input                      |     Output     | Notes                                                                                        |
| -------------------------- | :------------: | -------------------------------------------------------------------------------------------- |
| `[1,2,3]`                  |   `[1,2,3]`    | Full copy                                                                                    |
| `{a: 1, b: 2}`             | `{a: 1, b: 2}` | Full copy                                                                                    |
| `{a: 1, b() { return 2; }` |    `{a: 1}`    | Full copy, functions omitted                                                                 |
| `new MyClass()`            |    `{...}`     | Just the properties                                                                          |
| `Map`                      |     `Map`      | [`Map`][map] is structured cloneable                                                         |
| `Set`                      |     `Set`      | [`Set`][set] is structured cloneable                                                         |
| `ArrayBuffer`              | `ArrayBuffer`  | [`ArrayBuffer`][arraybuffer] is structured cloneable                                         |
| `Uint32Array`              | `Uint32Array`  | [`Uint32Array`][uint32array] and all the other typed arrays are structured cloneable         |
| `Event`                    |       ❌       |                                                                                              |
| Any DOM element            |       ❌       |                                                                                              |
| `MessagePort`              |       ❌       | Only transferable, not structured cloneable                                                  |
| `Request`                  |       ❌       |                                                                                              |
| `Response`                 |       ❌       |                                                                                              |
| `ReadableStream`           |       ❌       | [Streams are planned to be transferable][transferable streams], but not structured cloneable |

[structured clone]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
[set]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
[arraybuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[uint32array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array
[transferable streams]: https://github.com/whatwg/streams/blob/master/transferable-streams-explainer.md
