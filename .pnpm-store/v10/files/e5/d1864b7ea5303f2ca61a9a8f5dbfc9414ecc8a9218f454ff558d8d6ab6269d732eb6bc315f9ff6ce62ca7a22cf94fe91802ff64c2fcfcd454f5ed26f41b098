# Global Installation

Undici provides an `install()` function to add all WHATWG fetch classes to `globalThis`, making them available globally without requiring imports.

## `install()`

Install all WHATWG fetch classes globally on `globalThis`.

**Example:**

```js
import { install } from 'undici'

// Install all WHATWG fetch classes globally  
install()

// Now you can use fetch classes globally without importing
const response = await fetch('https://api.example.com/data')
const data = await response.json()

// All classes are available globally:
const headers = new Headers([['content-type', 'application/json']])
const request = new Request('https://example.com')
const formData = new FormData()
const ws = new WebSocket('wss://example.com')
const eventSource = new EventSource('https://example.com/events')
```

## Installed Classes

The `install()` function adds the following classes to `globalThis`:

| Class | Description |
|-------|-------------|
| `fetch` | The fetch function for making HTTP requests |
| `Headers` | HTTP headers management |
| `Response` | HTTP response representation |
| `Request` | HTTP request representation |
| `FormData` | Form data handling |
| `WebSocket` | WebSocket client |
| `CloseEvent` | WebSocket close event |
| `ErrorEvent` | WebSocket error event |
| `MessageEvent` | WebSocket message event |
| `EventSource` | Server-sent events client |

## Using `FormData` with `fetch`

If you send a `FormData` body, use matching implementations for `fetch` and
`FormData`.

These two patterns are safe:

```js
// Built-in globals from Node.js
const body = new FormData()
await fetch('https://example.com', {
  method: 'POST',
  body
})
```

```js
// Globals installed from the undici package
import { install } from 'undici'

install()

const body = new FormData()
await fetch('https://example.com', {
  method: 'POST',
  body
})
```

After `install()`, `fetch`, `Headers`, `Response`, `Request`, and `FormData`
all come from the installed `undici` package, so they work as a matching set.

If you do not want to install globals, import both from `undici` instead:

```js
import { fetch, FormData } from 'undici'

const body = new FormData()
await fetch('https://example.com', {
  method: 'POST',
  body
})
```

Avoid mixing a global `FormData` with `undici.fetch()`, or `undici.FormData`
with the built-in global `fetch()`. Keeping them paired avoids surprising
multipart behavior across Node.js and undici versions.

## Use Cases

Global installation is useful for:

- **Polyfilling environments** that don't have native fetch support
- **Ensuring consistent behavior** across different Node.js versions
- **Library compatibility** when third-party libraries expect global fetch
- **Migration scenarios** where you want to replace built-in implementations
- **Testing environments** where you need predictable fetch behavior

## Example: Polyfilling an Environment

```js
import { install } from 'undici'

// Check if fetch is available and install if needed
if (typeof globalThis.fetch === 'undefined') {
  install()
  console.log('Undici fetch installed globally')
}

// Now fetch is guaranteed to be available
const response = await fetch('https://api.example.com')
```

## Example: Testing Environment

```js
import { install } from 'undici'

// In test setup, ensure consistent fetch behavior
install()

// Now all tests use undici's implementations
test('fetch API test', async () => {
  const response = await fetch('https://example.com')
  expect(response).toBeInstanceOf(Response)
})
```

## Notes

- The `install()` function overwrites any existing global implementations
- Classes installed are undici's implementations, not Node.js built-ins
- This provides access to undici's latest features and performance improvements
- The global installation persists for the lifetime of the process