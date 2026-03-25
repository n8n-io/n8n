<h1 align="center">lru.min</h1>
<div align="center">

[![NPM Version](https://img.shields.io/npm/v/lru.min.svg?label=&color=70a1ff&logo=npm&logoColor=white)](https://www.npmjs.com/package/lru.min)
[![NPM Downloads](https://img.shields.io/npm/dm/lru.min.svg?label=&logo=npm&logoColor=white&color=45aaf2)](https://www.npmjs.com/package/lru.min)
[![Coverage](https://img.shields.io/codecov/c/github/wellwelwel/lru.min?label=&logo=codecov&logoColor=white&color=98cc00)](https://app.codecov.io/gh/wellwelwel/lru.min)<br />
[![GitHub Workflow Status (Node.js)](https://img.shields.io/github/actions/workflow/status/wellwelwel/lru.min/ci_node.yml?event=push&label=&branch=main&logo=nodedotjs&logoColor=535c68&color=badc58)](https://github.com/wellwelwel/lru.min/actions/workflows/ci_node.yml?query=branch%3Amain)
[![GitHub Workflow Status (Bun)](https://img.shields.io/github/actions/workflow/status/wellwelwel/lru.min/ci_bun.yml?event=push&label=&branch=main&logo=bun&logoColor=ffffff&color=f368e0)](https://github.com/wellwelwel/lru.min/actions/workflows/ci_bun.yml?query=branch%3Amain)
[![GitHub Workflow Status (Deno)](https://img.shields.io/github/actions/workflow/status/wellwelwel/lru.min/ci_deno.yml?event=push&label=&branch=main&logo=deno&logoColor=ffffff&color=079992)](https://github.com/wellwelwel/lru.min/actions/workflows/ci_deno.yml?query=branch%3Amain)

🔥 An extremely fast, efficient, and lightweight <strong><a href="https://en.m.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used_.28LRU.29">LRU</a> Cache</strong> for <strong>JavaScript</strong> (<strong>Browser</strong> compatible).

</div>

## Why another LRU?

- 🎖️ **lru.min** is fully compatible with both **Node.js** _(8+)_, **Bun**, **Deno** and, browser environments. All of this, while maintaining the same high performance [_(and a little more)_](https://github.com/wellwelwel/lru.min?tab=readme-ov-file#performance) as the most popular **LRU** packages.

---

## Install

```bash
# Node.js
npm i lru.min
```

```bash
# Bun
bun add lru.min
```

```bash
# Deno
deno add npm:lru.min
```

---

## Usage

### Quickstart

```js
import { createLRU } from 'lru.min';

const max = 2;
const onEviction = (key, value) => {
  console.log(`Key "${key}" with value "${value}" has been evicted.`);
};

const LRU = createLRU({
  max,
  onEviction,
});

LRU.set('A', 'My Value');
LRU.set('B', 'Other Value');
LRU.set('C', 'Another Value');

// => Key "A" with value "My Value" has been evicted.

LRU.has('B');
LRU.get('B');
LRU.delete('B');

// => Key "B" with value "Other Value" has been evicted.

LRU.peek('C');

LRU.clear(); // ← recommended | LRU.evict(max) → (slower alternative)

// => Key "C" with value "Another Value" has been evicted.

LRU.set('D', "You're amazing 💛");

LRU.size; // 1
LRU.max; // 2
LRU.available; // 1

LRU.resize(10);

LRU.size; // 1
LRU.max; // 10
LRU.available; // 9
```

> For _up-to-date_ documentation, always follow the [**README.md**](https://github.com/wellwelwel/lru.min?tab=readme-ov-file#readme) in the **GitHub** repository.

### Import

#### ES Modules

```js
import { createLRU } from 'lru.min';
```

#### CommonJS

```js
const { createLRU } = require('lru.min');
```

#### Browser

> Requires **ES6**.

```html
<script src="https://cdn.jsdelivr.net/npm/lru.min@1.x.x/browser/lru.min.js"></script>
```

- You can use tools such as [**Babel**](https://github.com/babel/babel) to increase the compatibility rate.

### Create a new LRU Cache

> Set maximum size when creating **LRU**.

```ts
const LRU = createLRU({ max: 150_000 });
```

Also, you can set a callback for every deletion/eviction:

```ts
const LRU = createLRU({
  max: 150_000,
  onEviction: (key, value) => {
    // do something
  },
});
```

### Set a cache

Adds a key-value pair to the cache. Updates the value if the key already exists

```ts
LRU.set('key', 'value');
```

> `undefined` keys will simply be ignored.

- Complexity: **O(1)**.

### Get a cache

Retrieves the value for a given key and moves the key to the most recent position.

```ts
LRU.get('key');
```

- Complexity: **O(1)**.

### Peek a cache

Retrieves the value for a given key without changing its position.

```ts
LRU.peek('key');
```

- Complexity: **O(1)**.

### Check if a key exists

```ts
LRU.has('key');
```

- Complexity: **O(1)**.

### Delete a cache

```ts
LRU.delete('key');
```

- Complexity: **O(1)**.

### Evict from the oldest cache

Evicts the specified number of the oldest items from the cache.

```ts
LRU.evict(1000);
```

- Complexity: **O(key)** — even if passed a number greater than the number of items, only existing items will be evicted.

> [!TIP]
>
> - Methods that perform eviction(s) when maximum size is reached: `set` and `resize`.
> - Methods that always perform eviction(s): `delete`, `clear`, and `evict` itself.

### Resize the cache

Resizes the cache to a new maximum size, evicting items if necessary.

```ts
LRU.resize(50_000);
```

- Complexity:
  - Increasing: **O(newMax - max)**.
  - Downsizing: **O(n)**.

### Clear the cache

Clears and disposes (if used) all key-value pairs from the cache.

```ts
LRU.clear();
```

- Complexity:
  - Without `onEviction`: **O(1)**.
  - Using `onEviction`: **O(entries)**.

### Debugging

#### Get the max size of the cache

```ts
LRU.max;
```

- Complexity: **O(1)**.

#### Get the current size of the cache

```ts
LRU.size;
```

- Complexity: **O(1)**.

#### Get the available slots in the cache

```ts
LRU.available;
```

- Complexity: **O(1)**.

### Iterating the cache

#### Get all keys

Iterates over all keys in the cache, from most recent to least recent.

```ts
const keys = [...LRU.keys()];
```

- Complexity: **O(keys)**.

#### Get all values

Iterates over all values in the cache, from most recent to least recent.

```ts
const values = [...LRU.values()];
```

- Complexity: **O(values)**.

#### Get all entries

Iterates over `[key, value]` pairs in the cache, from most recent to least recent.

```ts
const entries = [...LRU.entries()];
```

- Complexity: **O(entries)**.

#### Run a callback for each entry

Iterates over each value-key pair in the cache, from most recent to least recent.

```ts
LRU.forEach((value, key) => {
  // do something
});
```

- Complexity: **O(entries)**.

---

> [!NOTE]
>
> - We use `O(keys)`, `O(values)`, `O(entries)`, and `O(newMax - max)` to explicitly indicate what is being iterated over. In traditional complexity notation, this would be represented as `O(n)`.

---

### TypeScript

You can set types for both keys and values. For example:

```ts
import { createLRU } from 'lru.min';

type Key = number;

type Value = {
  name: string;
};

const LRU = createLRU<Key, Value>({ max: 1000 });

LRU.set(1, { name: 'Peter' });
LRU.set(2, { name: 'Mary' });
```

Also:

```ts
import { createLRU, type CacheOptions } from 'lru.min';

type Key = number;

type Value = {
  name: string;
};

const options: CacheOptions<Key, Value> = {
  max: 10,
  onEviction(key, value) {
    console.log(key, value);
  },
};

// No need to repeat the type params
const LRU = createLRU(options);

LRU.set(1, { name: 'Peter' });
LRU.set(2, { name: 'Mary' });
```

---

### Performance

The benchmark is performed by comparing `1,000,000` runs through a maximum cache limit of `100,000`, getting `333,333` caches and deleting `200,000` keys 10 consecutive times, clearing the cache every run.

> - [**lru-cache**](https://github.com/isaacs/node-lru-cache) `v11.0.0`

```sh
# Time:
  lru.min:    240.45ms
  lru-cache:  258.32ms

# CPU:
  lru.min:    275558.30µs
  lru-cache:  306858.30µs
```

- See detailed results and how the tests are run and compared in the [**benchmark**](https://github.com/wellwelwel/lru.min/tree/main/benchmark) directory.

---

## Security Policy

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/wellwelwel/lru.min/ci_codeql.yml?event=push&label=&branch=main&logo=github&logoColor=white&color=f368e0)](https://github.com/wellwelwel/lru.min/actions/workflows/ci_codeql.yml?query=branch%3Amain)

Please check the [**SECURITY.md**](https://github.com/wellwelwel/lru.min/blob/main/SECURITY.md).

---

## Contributing

See the [**Contributing Guide**](https://github.com/wellwelwel/lru.min/blob/main/CONTRIBUTING.md) and please follow our [**Code of Conduct**](https://github.com/wellwelwel/lru.min/blob/main/CODE_OF_CONDUCT.md) 🚀

---

## Acknowledgements

- [![Contributors](https://img.shields.io/github/contributors/wellwelwel/lru.min?label=Contributors)](https://github.com/wellwelwel/lru.min/graphs/contributors)
- **lru.min** is inspired by [**lru-cache**](https://github.com/isaacs/node-lru-cache) architecture and [**quick-lru**](https://github.com/sindresorhus/quick-lru) usage, simplifying and improving their concepts for enhanced performance and compatibility.

> [!IMPORTANT]
>
> No [**lru-cache**](https://github.com/isaacs/node-lru-cache) or [**quick-lru**](https://github.com/sindresorhus/quick-lru) code is used in **lru.min**. For more comprehensive features such as **TTL** support, consider using and supporting them 🤝

---

## License

**lru.min** is under the [**MIT License**](https://github.com/wellwelwel/lru.min/blob/main/LICENSE).<br />
Copyright © 2024-present [Weslley Araújo](https://github.com/wellwelwel) and **lru.min** [contributors](https://github.com/wellwelwel/lru.min/graphs/contributors).
