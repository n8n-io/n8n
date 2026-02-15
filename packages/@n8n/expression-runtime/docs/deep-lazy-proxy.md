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

### Components

1. **Types** (`proxy/types.ts`)
   - `ArrayMetadata`: Describes arrays with length and optional data
   - `ObjectMetadata`: Describes objects with their keys
   - `ProxyCallbacks`: Interface for data fetching functions
   - `ProxyOptions`: Configuration options

2. **Callbacks** (`proxy/callbacks.ts`)
   - `createProxyCallbacks()`: Creates callback functions for data navigation
   - `getValueAtPath()`: Navigates to a value and returns metadata
   - `getArrayElement()`: Gets a specific array element

3. **Proxy Factory** (`proxy/deep-lazy-proxy.ts`)
   - `createDeepLazyProxy()`: Creates recursive object proxies
   - `createArrayProxy()`: Creates array proxies with lazy element loading

4. **Public API** (`proxy/index.ts`)
   - `createWorkflowDataProxy()`: Main entry point for workflow data

## Usage

### Basic Usage

```typescript
import { createWorkflowDataProxy } from '@n8n/expression-runtime';

const workflowData = {
  $json: {
    user: { name: 'John', email: 'john@example.com' },
    items: Array(1000).fill(0).map((_, i) => ({ id: i }))
  },
  $runIndex: 0,
  $itemIndex: 0,
};

const proxy = createWorkflowDataProxy(workflowData, {
  smallArrayThreshold: 100  // Arrays <= 100 elements transferred entirely
});

// Access properties - only loads what's needed
console.log(proxy.$json.user.name);  // 'John'
console.log(proxy.$json.items[500].id);  // 500 (lazy-loaded)
```

### Configuration Options

```typescript
export interface ProxyOptions {
  /** Max array size to transfer entirely (default: 100) */
  smallArrayThreshold?: number;
  /** Enable debug logging */
  debug?: boolean;
}
```

## How It Works

### Metadata Pattern

Instead of transferring entire objects/arrays, the proxy uses metadata:

**Small Arrays** (≤ threshold):
```typescript
{
  __isArray: true,
  __length: 5,
  __data: [1, 2, 3, 4, 5]  // Data included
}
```

**Large Arrays** (> threshold):
```typescript
{
  __isArray: true,
  __length: 1000,
  __data: null  // No data, load elements on-demand
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

- **Small Arrays**: Transferred entirely (faster access, small memory cost)
- **Large Arrays**: Elements loaded on-demand (slower access, minimal memory)
- **Objects**: Always lazy-loaded (only keys transferred)

### Access Patterns

Best performance when:
- Accessing few properties from large objects
- Accessing specific array elements (not iterating entire array)
- Accessing same properties multiple times (caching)

Suboptimal performance when:
- Iterating entire large arrays (`.map()`, `.filter()`)
- Accessing most properties of large objects
- No property reuse (no benefit from caching)

## Known Limitations

1. **Array Methods**: Methods like `.map()`, `.filter()` require full array
   - **Workaround**: Use element access or set higher `smallArrayThreshold`
   - **Future**: Implement proxy handlers for array methods

2. **Circular References**: May cause infinite loops
   - **Current**: Basic handling (proxies work, but can loop)
   - **Future**: Add circular reference detection

3. **No VM Isolation**: Currently works in same process
   - **Future Phase**: Port to isolated-vm with ivm.Reference

## Testing

### Unit Tests

```bash
cd packages/@n8n/expression-runtime
pnpm test proxy
```

Test coverage:
- ✅ Basic property access
- ✅ Nested properties
- ✅ Small/large arrays
- ✅ Object proxies
- ✅ Function handling
- ✅ Caching behavior
- ✅ Edge cases (circular refs, symbols, "in" operator)

### Manual Testing

Run the example:
```bash
npx tsx src/proxy/__tests__/manual-test.example.ts
```

## Future Integration

### Phase 2: Isolated VM Integration

The proxy is designed to be portable to isolated-vm:

1. **Convert callbacks to ivm.Reference**:
   ```typescript
   const callbacks = {
     getValueAtPath: new ivm.Reference((path) => { ... }),
     getArrayElement: new ivm.Reference((path, index) => { ... })
   };
   ```

2. **Load proxy factory into isolate**:
   ```typescript
   const script = await isolate.compileScript(proxyFactoryCode);
   await script.run(context);
   ```

3. **Create proxy in isolate**:
   ```typescript
   const createProxy = context.global.getSync('createDeepLazyProxy');
   createProxy.applySync(undefined, [basePath, callbacks]);
   ```

## API Reference

### `createWorkflowDataProxy(dataSource, options?)`

Creates a workflow data proxy with predefined properties.

**Parameters:**
- `dataSource: Record<string, unknown>` - The workflow data object
- `options?: ProxyOptions` - Configuration options

**Returns:** `Record<string, unknown>` - Proxy with workflow properties

**Properties Created:**
- `$json`, `$binary`, `$input`, `$node`, `$parameter`, `$workflow`, `$prevNode` - Lazy proxies
- `$runIndex`, `$itemIndex` - Primitive values (passed directly)
- `$items`, `$jmesPath`, `$getPairedItem` - Functions (passed directly)

### `createProxyCallbacks(dataSource, options?)`

Creates callback functions for data navigation.

**Parameters:**
- `dataSource: Record<string, unknown>` - The data source
- `options?: ProxyOptions` - Configuration options

**Returns:** `ProxyCallbacks` - Callback functions

### `createDeepLazyProxy(basePath, callbacks)`

Creates a deep lazy-loading proxy (low-level API).

**Parameters:**
- `basePath: string[]` - Current path in object tree
- `callbacks: ProxyCallbacks` - Functions to fetch data

**Returns:** `object` - Proxy object

## Examples

### Example 1: Accessing Nested Data

```typescript
const data = {
  $json: {
    order: {
      customer: { name: 'Alice' },
      items: [
        { product: 'Book', price: 10 },
        { product: 'Pen', price: 2 }
      ]
    }
  }
};

const proxy = createWorkflowDataProxy(data);
console.log(proxy.$json.order.customer.name);  // 'Alice'
console.log(proxy.$json.order.items[1].product);  // 'Pen'
```

### Example 2: Large Dataset

```typescript
const data = {
  $json: {
    records: Array(10000).fill(0).map((_, i) => ({
      id: i,
      data: 'x'.repeat(1000)  // 1KB per record
    }))
  }
};

const proxy = createWorkflowDataProxy(data, { smallArrayThreshold: 100 });

// Only loads one element (not 10MB)
console.log(proxy.$json.records[5000].id);  // 5000
```

### Example 3: Custom Configuration

```typescript
const proxy = createWorkflowDataProxy(data, {
  smallArrayThreshold: 500,  // Larger arrays transferred entirely
  debug: true  // Enable debug logging (not implemented yet)
});
```

## Contributing

When modifying the proxy implementation:

1. **Run tests**: `pnpm test proxy`
2. **Type check**: `pnpm typecheck`
3. **Build**: `pnpm build`
4. **Add tests** for new features
5. **Update this documentation**

## Related Files

- Implementation: `packages/@n8n/expression-runtime/src/proxy/`
- Tests: `packages/@n8n/expression-runtime/src/proxy/__tests__/`
- Types: `packages/@n8n/expression-runtime/src/proxy/types.ts`
- Plan: Root plan file with implementation details
