# minipass-fetch

An implementation of window.fetch in Node.js using Minipass streams

This is a fork (or more precisely, a reimplementation) of
[node-fetch](http://npm.im/node-fetch).  All streams have been replaced
with [minipass streams](http://npm.im/minipass).

The goal of this module is to stay in sync with the API presented by
`node-fetch`, with the exception of the streaming interface provided.

## Why

Minipass streams are faster and more deterministic in their timing contract
than node-core streams, making them a better fit for many server-side use
cases.

## API

See [node-fetch](http://npm.im/node-fetch)

Differences from `node-fetch` (and, by extension, from the WhatWG Fetch
specification):

- Returns [minipass](http://npm.im/minipass) streams instead of node-core
  streams.
- Supports the full set of [TLS Options that may be provided to
  `https.request()`](https://nodejs.org/api/https.html#https_https_request_options_callback)
  when making `https` requests.
