<h1 align="center"> <code>express-rate-limit</code> </h1>

<div align="center">

[![tests](https://img.shields.io/github/actions/workflow/status/express-rate-limit/express-rate-limit/ci.yaml)](https://github.com/express-rate-limit/express-rate-limit/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/express-rate-limit.svg)](https://npmjs.org/package/express-rate-limit 'View this project on NPM')
[![npm downloads](https://img.shields.io/npm/dm/express-rate-limit)](https://www.npmjs.com/package/express-rate-limit)
[![license](https://img.shields.io/npm/l/express-rate-limit)](license.md)

</div>

Basic rate-limiting middleware for [Express](http://expressjs.com/). Use to
limit repeated requests to public APIs and/or endpoints such as password reset.
Plays nice with
[express-slow-down](https://www.npmjs.com/package/express-slow-down) and
[ratelimit-header-parser](https://www.npmjs.com/package/ratelimit-header-parser).

## Usage

The [full documentation](https://express-rate-limit.mintlify.app/overview) is
available on-line.

```ts
import { rateLimit } from 'express-rate-limit'

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
	// store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)
```

### Data Stores

The rate limiter comes with a built-in memory store, and supports a variety of
[external data stores](https://express-rate-limit.mintlify.app/reference/stores).

### Configuration

All function options may be async. Click the name for additional info and
default values.

| Option                     | Type                                      | Remarks                                                                                         |
| -------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`windowMs`]               | `number`                                  | How long to remember requests for, in milliseconds.                                             |
| [`limit`]                  | `number` \| `function`                    | How many requests to allow.                                                                     |
| [`message`]                | `string` \| `json` \| `function`          | Response to return after limit is reached.                                                      |
| [`statusCode`]             | `number`                                  | HTTP status code after limit is reached (default is 429).                                       |
| [`handler`]                | `function`                                | Function to run after limit is reached (overrides `message` and `statusCode` settings, if set). |
| [`legacyHeaders`]          | `boolean`                                 | Enable the `X-Rate-Limit` header.                                                               |
| [`standardHeaders`]        | `'draft-6'` \| `'draft-7'` \| `'draft-8'` | Enable the `Ratelimit` header.                                                                  |
| [`identifier`]             | `string` \| `function`                    | Name associated with the quota policy enforced by this rate limiter.                            |
| [`store`]                  | `Store`                                   | Use a custom store to share hit counts across multiple nodes.                                   |
| [`passOnStoreError`]       | `boolean`                                 | Allow (`true`) or block (`false`, default) traffic if the store becomes unavailable.            |
| [`keyGenerator`]           | `function`                                | Identify users (defaults to IP address).                                                        |
| [`ipv6Subnet`]             | `number` (32-64) \| `function` \| `false` | How many bits of IPv6 addresses to use in default `keyGenerator`                                |
| [`requestPropertyName`]    | `string`                                  | Add rate limit info to the `req` object.                                                        |
| [`skip`]                   | `function`                                | Return `true` to bypass the limiter for the given request.                                      |
| [`skipSuccessfulRequests`] | `boolean`                                 | Uncount 1xx/2xx/3xx responses.                                                                  |
| [`skipFailedRequests`]     | `boolean`                                 | Uncount 4xx/5xx responses.                                                                      |
| [`requestWasSuccessful`]   | `function`                                | Used by `skipSuccessfulRequests` and `skipFailedRequests`.                                      |
| [`validate`]               | `boolean` \| `object`                     | Enable or disable built-in validation checks.                                                   |

## Thank You

Sponsored by [Zuplo](https://zuplo.link/express-rate-limit) a fully-managed API
Gateway for developers. Add
[dynamic rate-limiting](https://zuplo.link/dynamic-rate-limiting),
authentication and more to any API in minutes. Learn more at
[zuplo.com](https://zuplo.link/express-rate-limit)

<p align="center">
<a href="https://zuplo.link/express-rate-limit">
<picture width="322">
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/express-rate-limit/express-rate-limit/assets/114976/cd2f6fa7-eae1-4fbb-be7d-b17df4c6f383">
  <img alt="zuplo-logo" src="https://github.com/express-rate-limit/express-rate-limit/assets/114976/66fd75fa-b39e-4a8c-8d7a-52369bf244dc" width="322">
</picture>
</a>
</p>

---

Thanks to Mintlify for hosting the documentation at
[express-rate-limit.mintlify.app](https://express-rate-limit.mintlify.app)

<p align="center">
	<a href="https://mintlify.com/?utm_campaign=devmark&utm_medium=readme&utm_source=express-rate-limit">
		<img height="75" src="https://devmark-public-assets.s3.us-west-2.amazonaws.com/sponsorships/mintlify.svg" alt="Create your docs today">
	</a>
</p>

---

Finally, thank you to everyone who's contributed to this project in any way! 🫶

## Issues and Contributing

If you encounter a bug or want to see something added/changed, please go ahead
and
[open an issue](https://github.com/express-rate-limit/express-rate-limit/issues/new)!
If you need help with something, feel free to
[start a discussion](https://github.com/express-rate-limit/express-rate-limit/discussions/new)!

If you wish to contribute to the library, thanks! First, please read
[the contributing guide](https://express-rate-limit.mintlify.app/docs/guides/contributing.mdx).
Then you can pick up any issue and fix/implement it!

## License

MIT © [Nathan Friedly](http://nfriedly.com/),
[Vedant K](https://github.com/gamemaker1)

[`windowMs`]:
	https://express-rate-limit.mintlify.app/reference/configuration#windowms
[`limit`]: https://express-rate-limit.mintlify.app/reference/configuration#limit
[`message`]:
	https://express-rate-limit.mintlify.app/reference/configuration#message
[`statusCode`]:
	https://express-rate-limit.mintlify.app/reference/configuration#statuscode
[`handler`]:
	https://express-rate-limit.mintlify.app/reference/configuration#handler
[`legacyHeaders`]:
	https://express-rate-limit.mintlify.app/reference/configuration#legacyheaders
[`standardHeaders`]:
	https://express-rate-limit.mintlify.app/reference/configuration#standardheaders
[`identifier`]:
	https://express-rate-limit.mintlify.app/reference/configuration#identifier
[`store`]: https://express-rate-limit.mintlify.app/reference/configuration#store
[`passOnStoreError`]:
	https://express-rate-limit.mintlify.app/reference/configuration#passonstoreerror
[`keyGenerator`]:
	https://express-rate-limit.mintlify.app/reference/configuration#keygenerator
[`ipv6Subnet`]:
	https://express-rate-limit.mintlify.app/reference/configuration#ipv6subnet
[`requestPropertyName`]:
	https://express-rate-limit.mintlify.app/reference/configuration#requestpropertyname
[`skip`]: https://express-rate-limit.mintlify.app/reference/configuration#skip
[`skipSuccessfulRequests`]:
	https://express-rate-limit.mintlify.app/reference/configuration#skipsuccessfulrequests
[`skipFailedRequests`]:
	https://express-rate-limit.mintlify.app/reference/configuration#skipfailedrequests
[`requestWasSuccessful`]:
	https://express-rate-limit.mintlify.app/reference/configuration#requestwassuccessful
[`validate`]:
	https://express-rate-limit.mintlify.app/reference/configuration#validate
