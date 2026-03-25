# Helmet

Help secure Express apps by setting HTTP response headers.

```javascript
import helmet from "helmet";

const app = express();

app.use(helmet());
```

Helmet sets the following headers by default:

- [`Content-Security-Policy`](#content-security-policy): A powerful allow-list of what can happen on your page which mitigates many attacks
- [`Cross-Origin-Opener-Policy`](#cross-origin-opener-policy): Helps process-isolate your page
- [`Cross-Origin-Resource-Policy`](#cross-origin-resource-policy): Blocks others from loading your resources cross-origin
- [`Origin-Agent-Cluster`](#origin-agent-cluster): Changes process isolation to be origin-based
- [`Referrer-Policy`](#referrer-policy): Controls the [`Referer`][Referer] header
- [`Strict-Transport-Security`](#strict-transport-security): Tells browsers to prefer HTTPS
- [`X-Content-Type-Options`](#x-content-type-options): Avoids [MIME sniffing]
- [`X-DNS-Prefetch-Control`](#x-dns-prefetch-control): Controls DNS prefetching
- [`X-Download-Options`](#x-download-options): Forces downloads to be saved (Internet Explorer only)
- [`X-Frame-Options`](#x-frame-options): Legacy header that mitigates [clickjacking] attacks
- [`X-Permitted-Cross-Domain-Policies`](#x-permitted-cross-domain-policies): Controls cross-domain behavior for Adobe products, like Acrobat
- [`X-Powered-By`](#x-powered-by): Info about the web server. Removed because it could be used in simple attacks
- [`X-XSS-Protection`](#x-xss-protection): Legacy header that tries to mitigate [XSS attacks][XSS], but makes things worse, so Helmet disables it

Each header can be configured. For example, here's how you configure the `Content-Security-Policy` header:

```js
// Configure the Content-Security-Policy header.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "example.com"],
      },
    },
  }),
);
```

Headers can also be disabled. For example, here's how you disable the `Content-Security-Policy` and `X-Download-Options` headers:

```js
// Disable the Content-Security-Policy and X-Download-Options headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    xDownloadOptions: false,
  }),
);
```

## Reference

<details id="content-security-policy">
<summary><code>Content-Security-Policy</code></summary>

Default:

```http
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
```

The `Content-Security-Policy` header mitigates a large number of attacks, such as [cross-site scripting][XSS]. See [MDN's introductory article on Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).

This header is powerful but likely requires some configuration for your specific app.

To configure this header, pass an object with a nested `directives` object. Each key is a directive name in camel case (such as `defaultSrc`) or kebab case (such as `default-src`). Each value is an array (or other iterable) of strings or functions for that directive. If a function appears in the array, it will be called with the request and response objects.

```javascript
// Sets all of the defaults, but overrides `script-src`
// and disables the default `style-src`.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "example.com"],
        "style-src": null,
      },
    },
  }),
);
```

```js
// Sets the `script-src` directive to
// "'self' 'nonce-e33cc...'"
// (or similar)
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(32).toString("hex");
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      },
    },
  }),
);
```

These directives are merged into a default policy, which you can disable by setting `useDefaults` to `false`.

```javascript
// Sets "Content-Security-Policy: default-src 'self';
// script-src 'self' example.com;object-src 'none';
// upgrade-insecure-requests"
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "example.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);
```

You can get the default directives object with `helmet.contentSecurityPolicy.getDefaultDirectives()`. Here is the default policy (formatted for readability):

```
default-src 'self';
base-uri 'self';
font-src 'self' https: data:;
form-action 'self';
frame-ancestors 'self';
img-src 'self' data:;
object-src 'none';
script-src 'self';
script-src-attr 'none';
style-src 'self' https: 'unsafe-inline';
upgrade-insecure-requests
```

The `default-src` directive can be explicitly disabled by setting its value to `helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc`, but this is not recommended.

You can set the [`Content-Security-Policy-Report-Only`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only) instead:

```javascript
// Sets the Content-Security-Policy-Report-Only header
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        /* ... */
      },
      reportOnly: true,
    },
  }),
);
```

Helmet performs very little validation on your CSP. You should rely on CSP checkers like [CSP Evaluator](https://csp-evaluator.withgoogle.com/) instead.

To disable the `Content-Security-Policy` header:

```js
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.contentSecurityPolicy())`.

</details>

<details id="cross-origin-embedder-policy">
<summary><code>Cross-Origin-Embedder-Policy</code></summary>

This header is not set by default.

The `Cross-Origin-Embedder-Policy` header helps control what resources can be loaded cross-origin. See [MDN's article on this header](https://developer.cdn.mozilla.net/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy) for more.

```js
// Helmet does not set Cross-Origin-Embedder-Policy
// by default.
app.use(helmet());

// Sets "Cross-Origin-Embedder-Policy: require-corp"
app.use(helmet({ crossOriginEmbedderPolicy: true }));

// Sets "Cross-Origin-Embedder-Policy: credentialless"
app.use(helmet({ crossOriginEmbedderPolicy: { policy: "credentialless" } }));
```

You can use this as standalone middleware with `app.use(helmet.crossOriginEmbedderPolicy())`.

</details>

<details id="cross-origin-opener-policy">
<summary><code>Cross-Origin-Opener-Policy</code></summary>

Default:

```http
Cross-Origin-Opener-Policy: same-origin
```

The `Cross-Origin-Opener-Policy` header helps process-isolate your page. For more, see [MDN's article on this header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy).

```js
// Sets "Cross-Origin-Opener-Policy: same-origin"
app.use(helmet());

// Sets "Cross-Origin-Opener-Policy: same-origin-allow-popups"
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }),
);
```

To disable the `Cross-Origin-Opener-Policy` header:

```js
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.crossOriginOpenerPolicy())`.

</details>

<details id="cross-origin-resource-policy">
<summary><code>Cross-Origin-Resource-Policy</code></summary>

Default:

```http
Cross-Origin-Resource-Policy: same-origin
```

The `Cross-Origin-Resource-Policy` header blocks others from loading your resources cross-origin in some cases. For more, see ["Consider deploying Cross-Origin Resource Policy"](https://resourcepolicy.fyi/) and [MDN's article on this header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy).

```js
// Sets "Cross-Origin-Resource-Policy: same-origin"
app.use(helmet());

// Sets "Cross-Origin-Resource-Policy: same-site"
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
```

To disable the `Cross-Origin-Resource-Policy` header:

```js
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.crossOriginResourcePolicy())`.

</details>

<details id="origin-agent-cluster">
<summary><code>Origin-Agent-Cluster</code></summary>

Default:

```http
Origin-Agent-Cluster: ?1
```

The `Origin-Agent-Cluster` header provides a mechanism to allow web applications to isolate their origins from other processes. Read more about it [in the spec](https://whatpr.org/html/6214/origin.html#origin-keyed-agent-clusters).

This header takes no options and is set by default.

```js
// Sets "Origin-Agent-Cluster: ?1"
app.use(helmet());
```

To disable the `Origin-Agent-Cluster` header:

```js
app.use(
  helmet({
    originAgentCluster: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.originAgentCluster())`.

</details>

<details id="referrer-policy">
<summary><code>Referrer-Policy</code></summary>

Default:

```http
Referrer-Policy: no-referrer
```

The `Referrer-Policy` header which controls what information is set in [the `Referer` request header][Referer]. See ["Referer header: privacy and security concerns"](https://developer.mozilla.org/en-US/docs/Web/Security/Referer_header:_privacy_and_security_concerns) and [the header's documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy) on MDN for more.

```js
// Sets "Referrer-Policy: no-referrer"
app.use(helmet());
```

`policy` is a string or array of strings representing the policy. If passed as an array, it will be joined with commas, which is useful when setting [a fallback policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy#Specifying_a_fallback_policy). It defaults to `no-referrer`.

```js
// Sets "Referrer-Policy: no-referrer"
app.use(
  helmet({
    referrerPolicy: {
      policy: "no-referrer",
    },
  }),
);

// Sets "Referrer-Policy: origin,unsafe-url"
app.use(
  helmet({
    referrerPolicy: {
      policy: ["origin", "unsafe-url"],
    },
  }),
);
```

To disable the `Referrer-Policy` header:

```js
app.use(
  helmet({
    referrerPolicy: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.referrerPolicy())`.

</details>

<details id="strict-transport-security">
<summary><code>Strict-Transport-Security</code></summary>

Default:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

The `Strict-Transport-Security` header tells browsers to prefer HTTPS instead of insecure HTTP. See [the documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security) for more.

```js
// Sets "Strict-Transport-Security: max-age=31536000; includeSubDomains"
app.use(helmet());
```

`maxAge` is the number of seconds browsers should remember to prefer HTTPS. If passed a non-integer, the value is rounded down. It defaults to 365 days.

`includeSubDomains` is a boolean which dictates whether to include the `includeSubDomains` directive, which makes this policy extend to subdomains. It defaults to `true`.

`preload` is a boolean. If true, it adds the `preload` directive, expressing intent to add your HSTS policy to browsers. See [the "Preloading Strict Transport Security" section on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security#Preloading_Strict_Transport_Security) for more. It defaults to `false`.

```js
// Sets "Strict-Transport-Security: max-age=123456; includeSubDomains"
app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 123456,
    },
  }),
);

// Sets "Strict-Transport-Security: max-age=123456"
app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 123456,
      includeSubDomains: false,
    },
  }),
);

// Sets "Strict-Transport-Security: max-age=123456; includeSubDomains; preload"
app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 63072000,
      preload: true,
    },
  }),
);
```

To disable the `Strict-Transport-Security` header:

```js
app.use(
  helmet({
    strictTransportSecurity: false,
  }),
);
```

You may wish to disable this header for local development, as it can make your browser force redirects from `http://localhost` to `https://localhost`, which may not be desirable if you develop multiple apps using `localhost`. See [this issue](https://github.com/helmetjs/helmet/issues/451) for more discussion.

You can use this as standalone middleware with `app.use(helmet.strictTransportSecurity())`.

</details>

<details id="x-content-type-options">
<summary><code>X-Content-Type-Options</code></summary>

Default:

```http
X-Content-Type-Options: nosniff
```

The `X-Content-Type-Options` mitigates [MIME type sniffing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#MIME_sniffing) which can cause security issues. See [documentation for this header on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options) for more.

This header takes no options and is set by default.

```js
// Sets "X-Content-Type-Options: nosniff"
app.use(helmet());
```

To disable the `X-Content-Type-Options` header:

```js
app.use(
  helmet({
    xContentTypeOptions: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.xContentTypeOptions())`.

</details>

<details id="x-dns-prefetch-control">
<summary><code>X-DNS-Prefetch-Control</code></summary>

Default:

```http
X-DNS-Prefetch-Control: off
```

The `X-DNS-Prefetch-Control` header helps control DNS prefetching, which can improve user privacy at the expense of performance. See [documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control) for more.

```js
// Sets "X-DNS-Prefetch-Control: off"
app.use(helmet());
```

`allow` is a boolean dictating whether to enable DNS prefetching. It defaults to `false`.

Examples:

```js
// Sets "X-DNS-Prefetch-Control: off"
app.use(
  helmet({
    xDnsPrefetchControl: { allow: false },
  }),
);

// Sets "X-DNS-Prefetch-Control: on"
app.use(
  helmet({
    xDnsPrefetchControl: { allow: true },
  }),
);
```

To disable the `X-DNS-Prefetch-Control` header and use the browser's default value:

```js
app.use(
  helmet({
    xDnsPrefetchControl: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.xDnsPrefetchControl())`.

</details>

<details id="x-download-options">
<summary><code>X-Download-Options</code></summary>

Default:

```http
X-Download-Options: noopen
```

The `X-Download-Options` header is specific to Internet Explorer 8. It forces potentially-unsafe downloads to be saved, mitigating execution of HTML in your site's context. For more, see [this old post on MSDN](https://docs.microsoft.com/en-us/archive/blogs/ie/ie8-security-part-v-comprehensive-protection).

This header takes no options and is set by default.

```js
// Sets "X-Download-Options: noopen"
app.use(helmet());
```

To disable the `X-Download-Options` header:

```js
app.use(
  helmet({
    xDownloadOptions: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.xDownloadOptions())`.

</details>

<details id="x-frame-options">
<summary><code>X-Frame-Options</code></summary>

Default:

```http
X-Frame-Options: SAMEORIGIN
```

The legacy `X-Frame-Options` header to help you mitigate [clickjacking attacks](https://en.wikipedia.org/wiki/Clickjacking). This header is superseded by [the `frame-ancestors` Content Security Policy directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors) but is still useful on old browsers or if no CSP is used. For more, see [the documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options).

```js
// Sets "X-Frame-Options: SAMEORIGIN"
app.use(helmet());
```

`action` is a string that specifies which directive to use—either `DENY` or `SAMEORIGIN`. (A legacy directive, `ALLOW-FROM`, is not supported by Helmet. [Read more here.](https://github.com/helmetjs/helmet/wiki/How-to-use-X%E2%80%93Frame%E2%80%93Options's-%60ALLOW%E2%80%93FROM%60-directive)) It defaults to `SAMEORIGIN`.

Examples:

```js
// Sets "X-Frame-Options: DENY"
app.use(
  helmet({
    xFrameOptions: { action: "deny" },
  }),
);

// Sets "X-Frame-Options: SAMEORIGIN"
app.use(
  helmet({
    xFrameOptions: { action: "sameorigin" },
  }),
);
```

To disable the `X-Frame-Options` header:

```js
app.use(
  helmet({
    xFrameOptions: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.xFrameOptions())`.

</details>

<details id="x-permitted-cross-domain-policies">
<summary><code>X-Permitted-Cross-Domain-Policies</code></summary>

Default:

```http
X-Permitted-Cross-Domain-Policies: none
```

The `X-Permitted-Cross-Domain-Policies` header tells some clients (mostly Adobe products) your domain's policy for loading cross-domain content. See [the description on OWASP](https://owasp.org/www-project-secure-headers/) for more.

```js
// Sets "X-Permitted-Cross-Domain-Policies: none"
app.use(helmet());
```

`permittedPolicies` is a string that must be `"none"`, `"master-only"`, `"by-content-type"`, or `"all"`. It defaults to `"none"`.

Examples:

```js
// Sets "X-Permitted-Cross-Domain-Policies: none"
app.use(
  helmet({
    xPermittedCrossDomainPolicies: {
      permittedPolicies: "none",
    },
  }),
);

// Sets "X-Permitted-Cross-Domain-Policies: by-content-type"
app.use(
  helmet({
    xPermittedCrossDomainPolicies: {
      permittedPolicies: "by-content-type",
    },
  }),
);
```

To disable the `X-Permitted-Cross-Domain-Policies` header:

```js
app.use(
  helmet({
    xPermittedCrossDomainPolicies: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.xPermittedCrossDomainPolicies())`.

</details>

<details id="x-powered-by">
<summary><code>X-Powered-By</code></summary>

Default: the `X-Powered-By` header, if present, is removed.

Helmet removes the `X-Powered-By` header, which is set by default in Express and some other frameworks. Removing the header offers very limited security benefits (see [this discussion](https://github.com/expressjs/express/pull/2813#issuecomment-159270428)) and is mostly removed to save bandwidth, but may thwart simplistic attackers.

Note: [Express has a built-in way to disable the `X-Powered-By` header](https://stackoverflow.com/a/12484642/804100), which you may wish to use instead.

The removal of this header takes no options. The header is removed by default.

To disable this behavior:

```js
// Not required, but recommended for Express users:
app.disable("x-powered-by");

// Ask Helmet to ignore the X-Powered-By header.
app.use(
  helmet({
    xPoweredBy: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.xPoweredBy())`.

</details>

<details id="x-xss-protection">
<summary><code>X-XSS-Protection</code></summary>

Default:

```http
X-XSS-Protection: 0
```

Helmet disables browsers' buggy cross-site scripting filter by setting the legacy `X-XSS-Protection` header to `0`. See [discussion about disabling the header here](https://github.com/helmetjs/helmet/issues/230) and [documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection).

This header takes no options and is set by default.

To disable the `X-XSS-Protection` header:

```js
// This is not recommended.
app.use(
  helmet({
    xXssProtection: false,
  }),
);
```

You can use this as standalone middleware with `app.use(helmet.xXssProtection())`.

</details>

[Referer]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer
[MIME sniffing]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#mime_sniffing
[Clickjacking]: https://en.wikipedia.org/wiki/Clickjacking
[XSS]: https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting
