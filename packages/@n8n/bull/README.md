# @n8n/bull

The n8n fork of [Bull](https://github.com/OptimalBits/bull), the Redis-based
job queue. Only `packages/cli` uses it, for queue mode in engine v1.

## Origin

- Upstream tag `v4.16.4`, commit `65355b88838db6d36577c22ec7d4a876a70fad96`.
- `index.js`, `index.d.ts`, `lib` and `LICENSE.md` come from the `bull@4.16.4`
  npm tarball. `test` comes from the upstream tag.
- Upstream is in maintenance mode. We do not sync with it.

## Lua scripts

`lib/scripts/*.js` is the source of the Lua scripts. Each file holds the Lua in
a JS template string, with the shared includes already pasted in. There is no
Lua build step. If you change shared include code, change it in each script
that uses it.

## Tests

The upstream mocha suite does not run in CI. To run it, start Redis 6.2 or
later on `127.0.0.1:6379`, then run:

```bash
pnpm --filter @n8n/bull test
```
