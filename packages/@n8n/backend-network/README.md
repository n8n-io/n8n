# @n8n/backend-network

The single home for n8n's backend outbound-network concerns.

## Why this package exists

Today network behavior is scattered across `packages/core` and several `@n8n/*` packages. 

This package consolidates into one place behind a single factory contract: 
SSRF/DNS guarding, proxy handling, and the HTTP client plumbing.
The eventual goal is to make backend network behavior reviewable and controllable from a single entry point.

## Using the factory

Backend code that needs to make an outbound HTTP request should obtain a client
from this package rather than importing an HTTP library directly. That way every
call inherits SSRF/DNS guarding and proxy handling from one place.

Inject the `OutboundHttp` service and pick by intent:

```ts
import { Service } from '@n8n/di';
import { OutboundHttp } from '@n8n/backend-network';

@Service()
export class MyService {
	constructor(private readonly http: OutboundHttp) {}

	// You make a request and get a response.
	async fetchThing() {
		return await this.http.requests().request({ url: 'https://api.example.com/thing' });
	}

	// You hand a guarded transport to a third-party SDK.
	makeClient() {
		const fetch = this.http.transport().asCustomFetch();
		return new SomeSdk({ fetch });
	}
}
```

In DI-less code (e.g. task-runner), build the transport directly from the
dependency-free subpath: `import { buildDispatcher } from '@n8n/backend-network/transport'`.

## The boundary rule

The `n8n-local-rules/no-uncentralized-http` ESLint rule enforces this.
It is on by default for every Node backend package.

Two sanctioned escape hatches, depending on the shape of the exception:

**1. Inline disable** When a single callsite legitimately cannot use the factory, disable the
rule on the line with a justifying comment:

```ts
// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- <reason>
import axios from 'axios';
```

Always include the reason after `--`. 

**2. Central allow list** For whole packages that are out of scope, add the file
path (a substring of the absolute path is enough) to the `allow` list in
`packages/@n8n/eslint-config/src/configs/backend-network-boundary.ts`.

Keep the list shrinking: every entry is debt or a documented carve-out, not a default.
