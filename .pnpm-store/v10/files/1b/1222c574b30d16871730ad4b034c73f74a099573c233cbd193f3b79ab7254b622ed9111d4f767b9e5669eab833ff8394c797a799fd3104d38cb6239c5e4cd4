# `auth-js`

An isomorphic JavaScript client library for the [Supabase Auth](https://github.com/supabase/auth) API.

## Docs

- Using `auth-js`: https://supabase.com/docs/reference/javascript/auth-signup
- TypeDoc: https://supabase.github.io/auth-js/v2

## Quick start

Install

```bash
npm install --save @supabase/auth-js
```

Usage

```js
import { AuthClient } from '@supabase/auth-js'

const GOTRUE_URL = 'http://localhost:9999'

const auth = new AuthClient({ url: GOTRUE_URL })
```

- `signUp()`: https://supabase.io/docs/reference/javascript/auth-signup
- `signIn()`: https://supabase.io/docs/reference/javascript/auth-signin
- `signOut()`: https://supabase.io/docs/reference/javascript/auth-signout

### Custom `fetch` implementation

`auth-js` uses the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) library to make HTTP requests, but an alternative `fetch` implementation can be provided as an option. This is most useful in environments where `cross-fetch` is not compatible, for instance Cloudflare Workers:

```js
import { AuthClient } from '@supabase/auth-js'

const AUTH_URL = 'http://localhost:9999'

const auth = new AuthClient({ url: AUTH_URL, fetch: fetch })
```

## Sponsors

We are building the features of Firebase using enterprise-grade, open source products. We support existing communities wherever possible, and if the products don’t exist we build them and open source them ourselves.

[![New Sponsor](https://user-images.githubusercontent.com/10214025/90518111-e74bbb00-e198-11ea-8f88-c9e3c1aa4b5b.png)](https://github.com/sponsors/supabase)

![Watch this repo](https://gitcdn.xyz/repo/supabase/monorepo/master/web/static/watch-repo.gif 'Watch this repo')
