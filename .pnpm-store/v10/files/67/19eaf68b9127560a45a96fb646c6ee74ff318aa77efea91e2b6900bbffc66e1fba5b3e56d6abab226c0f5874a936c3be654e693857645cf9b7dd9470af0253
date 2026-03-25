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