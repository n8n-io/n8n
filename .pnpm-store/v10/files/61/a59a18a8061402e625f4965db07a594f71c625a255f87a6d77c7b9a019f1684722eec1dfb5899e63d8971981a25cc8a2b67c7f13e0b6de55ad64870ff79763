# Class: RedirectHandler

A class that handles redirection logic for HTTP requests.

## `new RedirectHandler(dispatch, maxRedirections, opts, handler, redirectionLimitReached)`

Arguments:

- **dispatch** `function` - The dispatch function to be called after every retry.
- **maxRedirections** `number` - Maximum number of redirections allowed.
- **opts** `object` - Options for handling redirection.
- **handler** `object` - An object containing handlers for different stages of the request lifecycle.
- **redirectionLimitReached** `boolean` (default: `false`) - A flag that the implementer can provide to enable or disable the feature. If set to `false`, it indicates that the caller doesn't want to use the feature and prefers the old behavior.

Returns: `RedirectHandler`

### Parameters

- **dispatch** `(options: Dispatch.DispatchOptions, handlers: Dispatch.DispatchHandler) => Promise<Dispatch.DispatchResponse>` (required) - Dispatch function to be called after every redirection.
- **maxRedirections** `number` (required) - Maximum number of redirections allowed.
- **opts** `object` (required) - Options for handling redirection.
- **handler** `object` (required) - Handlers for different stages of the request lifecycle.
- **redirectionLimitReached** `boolean` (default: `false`) - A flag that the implementer can provide to enable or disable the feature. If set to `false`, it indicates that the caller doesn't want to use the feature and prefers the old behavior.

### Properties

- **location** `string` - The current redirection location.
- **abort** `function` - The abort function.
- **opts** `object` - The options for handling redirection.
- **maxRedirections** `number` - Maximum number of redirections allowed.
- **handler** `object` - Handlers for different stages of the request lifecycle.
- **history** `Array` - An array representing the history of URLs during redirection.
- **redirectionLimitReached** `boolean` - Indicates whether the redirection limit has been reached.

### Methods

#### `onConnect(abort)`

Called when the connection is established.

Parameters:

- **abort** `function` - The abort function.

#### `onUpgrade(statusCode, headers, socket)`

Called when an upgrade is requested.

Parameters:

- **statusCode** `number` - The HTTP status code.
- **headers** `object` - The headers received in the response.
- **socket** `object` - The socket object.

#### `onError(error)`

Called when an error occurs.

Parameters:

- **error** `Error` - The error that occurred.

#### `onHeaders(statusCode, headers, resume, statusText)`

Called when headers are received.

Parameters:

- **statusCode** `number` - The HTTP status code.
- **headers** `object` - The headers received in the response.
- **resume** `function` - The resume function.
- **statusText** `string` - The status text.

#### `onData(chunk)`

Called when data is received.

Parameters:

- **chunk** `Buffer` - The data chunk received.

#### `onComplete(trailers)`

Called when the request is complete.

Parameters:

- **trailers** `object` - The trailers received.

#### `onBodySent(chunk)`

Called when the request body is sent.

Parameters:

- **chunk** `Buffer` - The chunk of the request body sent.
