# EventSource

[![https://www.npmjs.com/package/extended-eventsource](https://img.shields.io/npm/v/extended-eventsource?logo=npm)](https://www.npmjs.com/package/extended-eventsource)
[![https://www.npmjs.com/package/extended-eventsource](https://img.shields.io/npm/dm/extended-eventsource?logo=npm)](https://www.npmjs.com/package/extended-eventsource)
![NPM](https://img.shields.io/npm/l/extended-eventsource)

This is a custom EventSource implementation that is fully compliant with
the [WHATWG Server-Sent Events specification](https://html.spec.whatwg.org/multipage/server-sent-events.html) but takes
more arguments like request headers.

It can be used in both web and Node.js environments.

The motivation for this library is that the native browser EventSource does not offer options for changing the request
that is sent to the server.
This means that e.g. you can not send an authorization header. This is fixed by this library.

## Features

- Supports both web and Node.js environments
- Follows the WHATWG Server-Sent Events specification and can be uses everywhere where the native EventSource would be
  used.

## Installation

Install the package using npm:

```bash
npm i extended-eventsource
```

## Usage

The package exposes a single class called `EventSource`.
To use it, create a new instance of `EventSource` with the URL of the server-sent events endpoint, and an optional
configuration object.

### Web

```typescript
import { EventSource } from 'extended-eventsource';

const eventSource = new EventSource('/events', {
  headers: {
    Authorization: 'Bearer token',
  },
  retry: 3000,
});

eventSource.onopen = () => {
  console.log('Connection opened');
};

eventSource.onmessage = (event: MessageEvent) => {
  console.log('Message received:', event.data);
};

eventSource.onerror = (error) => {
  console.error('Error occurred:', error);
};


```

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
