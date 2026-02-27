# Deep Lazy Proxy

## Overview

The Deep Lazy Proxy is a memory-efficient mechanism for providing workflow data to expression evaluation contexts. Instead of copying entire data structures upfront, it loads data on-demand as properties are accessed.

## Key Features

- **On-Demand Loading**: Only fetches data when accessed
- **Metadata-Driven**: Returns object structure (keys, length) without values
- **Caching**: Values are cached after first access to avoid redundant lookups
- **Type Support**: Handles objects, arrays, functions, and primitives correctly
- **Memory Efficient**: Large arrays and objects don't cause memory overhead

## Architecture

The deep lazy proxy is implemented in `src/runtime/lazy-proxy.ts`, which is bundled
together with the other runtime modules into `dist/bundle/runtime.iife.js` and injected
into the V8 isolate at startup.

Key functions exposed on `globalThis` inside the isolate:

- `createDeepLazyProxy(basePath)` — creates recursive object/array proxies
- `resetDataProxies()` — called before each evaluation to reinitialise `$json`,
  `$input`, `$node`, etc. as fresh lazy proxies backed by the three host callbacks
- `__sanitize(key)` — runtime property-access guard that blocks `__proto__`,
  `constructor`, `prototype`, etc.

Host-side callbacks registered by `IsolatedVmBridge` as `ivm.Reference` objects
(synchronous cross-isolate calls):

- `__getValueAtPath(path[])` — returns a primitive, array metadata, or object metadata
- `__getArrayElement(path[], index)` — returns a single array element (or its metadata)
- `__callFunctionAtPath(path[], ...args)` — invokes a host-side function and returns the result

## Usage

The proxy system runs **inside the V8 isolate** and is not directly importable from
host code. The host sets up the data context by calling `bridge.execute(code, data)`,
which internally:

1. Registers three `ivm.Reference` callbacks with the current `data` object
2. Calls `resetDataProxies()` in the isolate to create fresh lazy proxies for
   `$json`, `$binary`, `$input`, `$node`, `$parameter`, `$workflow`, `$prevNode`
3. Runs the tournament-transformed expression code with `this === __data`

From the expression's perspective it just sees normal objects:

```typescript
// Inside an expression (runs in isolate):
$json.user.email        // triggers getValueAtPath(['$json','user','email'])
$json.items[150].id     // triggers getArrayElement(['$json','items'], 150)
$items()                // triggers callFunctionAtPath(['$items'])
```

### Array metadata

Arrays are **never transferred in full** — only their length is returned. Elements
are loaded individually on demand. Length can be determined from the host object
in O(1), but serialization cost is proportional to the total byte size of all
elements, which cannot be bounded from length alone.

```typescript
// __getValueAtPath returns:
{ __isArray: true, __length: 1000 }            // always metadata only
{ __isObject: true, __keys: ['name','email'] } // object — lazy
42                                              // primitive
```

## How It Works

### Metadata Pattern

Instead of transferring entire objects/arrays, the proxy uses metadata:

**Arrays** (all sizes):
```typescript
{
  __isArray: true,
  __length: 1000  // Only length; elements loaded on demand via __getArrayElement
}
```

**Objects**:
```typescript
{
  __isObject: true,
  __keys: ['name', 'email', 'age']  // Only keys, not values
}
```

### Caching

Once a property is accessed, it's cached in the proxy's target object:

```typescript
proxy.$json.user.name  // First access: fetches via callback
proxy.$json.user.name  // Second access: returns cached value
```

### Recursive Proxies

When accessing nested objects or arrays, new proxies are created:

```typescript
proxy.$json.user  // Creates proxy for user object
proxy.$json.items[50]  // Creates proxy for object at index 50
```

## Security

### Function Handling

- **Custom Functions**: Allowed and passed directly
- **Native Functions**: Blocked for security (e.g., `Object.keys`)

```typescript
const customFn = (x: number) => x * 2;  // Allowed
const nativeFn = Object.keys;  // Blocked (returns undefined)
```

Detection is done by checking if `fn.toString()` contains `'[native code]'`.

### Symbol Properties

Symbol properties return `undefined` to prevent security issues.

## Performance

### Memory Efficiency

- **Arrays**: Always lazy-loaded — only length transferred, elements fetched on demand
- **Objects**: Always lazy-loaded — only keys transferred, values fetched on demand

### Access Patterns

Best performance when:
- Accessing few properties from large objects
- Accessing specific array elements (not iterating entire array)
- Accessing the same properties multiple times (caching means only the first access pays)

Suboptimal performance when:
- Iterating entire arrays (`.map()`, `.filter()`) — each element triggers a separate callback
- Accessing most properties of large objects
- No property reuse (no benefit from caching)

## Known Limitations

1. **Array Methods**: Methods like `.map()`, `.filter()` iterate all elements.
   Each element triggers a separate `__getArrayElement` callback call, which is slow
   for large arrays.
   - **Workaround**: Avoid iterating large arrays in expressions; access specific indices instead

2. **Circular References**: May cause infinite loops in the proxy handler.
   - **Current**: No cycle detection; circular structures should be avoided in expression data

## Testing

### Integration Tests

```bash
cd packages/@n8n/expression-runtime
pnpm test
```

Test coverage:
- ✅ Basic property access
- ✅ Nested properties
- ✅ Array element access (lazy-loaded via `__getArrayElement`)
- ✅ Object proxies
- ✅ Function handling
- ✅ Caching behavior
- ✅ Edge cases (circular refs, symbols, "in" operator)

## API Reference (inside the isolate bundle)

These functions are available on `globalThis` within the V8 isolate after the
runtime bundle (`dist/bundle/runtime.iife.js`) is loaded.

### `resetDataProxies()`

Called by the bridge before each expression evaluation. Reads `$json`, `$binary`,
`$input`, `$node`, `$parameter`, `$workflow`, `$prevNode`, `$runIndex`, `$itemIndex`,
and `$items` from `__data` (populated via host callbacks) and exposes them on both
`globalThis` and `__data` so tournament-transformed code can access them via
`this.$json`, `this.$input`, etc.

### `createDeepLazyProxy(basePath)`

Creates a recursive Proxy for a given property path. Intercepts property access and
calls back to the host via `__getValueAtPath` to fetch structure metadata, then
creates nested proxies for objects or arrays as needed.

**Parameter:**
- `basePath: string[]` — path from the root data object to the node this proxy represents

## Examples

### Accessing nested data (expression syntax)

```
{{ $json.order.customer.name }}    // lazy-loads order.customer.name
{{ $json.order.items[1].product }} // lazy-loads array element at index 1
{{ $json.items[0] }}               // fetches only the first element
```

### Array iteration is slow for large arrays

```
{{ _.sum($json.items) }}
// items has 10 000 elements → length transferred, then 10 000 callback
// calls to fetch each element. Prefer accessing specific indices.
```

## Contributing

When modifying the proxy implementation:

1. **Run tests**: `pnpm test proxy`
2. **Type check**: `pnpm typecheck`
3. **Build**: `pnpm build`
4. **Add tests** for new features
5. **Update this documentation**

## Related Files

- Proxy implementation: `packages/@n8n/expression-runtime/src/runtime/lazy-proxy.ts` — `createDeepLazyProxy`
- Reset: `packages/@n8n/expression-runtime/src/runtime/reset.ts` — `resetDataProxies`
- Security globals: `packages/@n8n/expression-runtime/src/runtime/safe-globals.ts` — `SafeObject`, `SafeError`, `__sanitize`
- Runtime entry: `packages/@n8n/expression-runtime/src/runtime/index.ts` — wires all modules to `globalThis`
- Bridge: `packages/@n8n/expression-runtime/src/bridge/isolated-vm-bridge.ts` — registers `ivm.Reference` callbacks, loads bundle, calls `resetDataProxies`
- Build: `packages/@n8n/expression-runtime/esbuild.config.js` — bundles runtime to `dist/bundle/runtime.iife.js`
