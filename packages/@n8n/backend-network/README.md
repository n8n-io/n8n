# @n8n/backend-network

The single home for n8n's backend outbound-network concerns.

## Why this package exists

Today network behavior is scattered across `packages/core` and several `@n8n/*` packages. 

This package consolidates into one place behind a single factory contract: 
SSRF/DNS guarding, proxy handling, and the HTTP client plumbing.
The eventual goal is to make backend network behavior reviewable and controllable from a single entry point.

## Roadmap

Tracked in [CAT-3365](https://linear.app/n8n/issue/CAT-3365/unify-http-concerns-scope-the-backend-network-layer-into-n8nbackend).