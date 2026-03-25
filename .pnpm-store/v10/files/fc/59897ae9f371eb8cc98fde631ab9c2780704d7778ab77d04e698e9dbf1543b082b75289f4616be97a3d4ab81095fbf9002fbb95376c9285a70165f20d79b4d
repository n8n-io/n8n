# Crawling

[RFC 9309](https://datatracker.ietf.org/doc/html/rfc9309) defines crawlers as automated clients.

Some web servers may reject requests that omit the `User-Agent` header or that use common defaults such as `'curl/7.79.1'`.

In **undici**, the default user agent is `'undici'`. Since undici is integrated into Node.js core as the implementation of `fetch()`, requests made via `fetch()` use `'node'` as the default user agent.

It is recommended to specify a **custom `User-Agent` header** when implementing crawlers. Providing a descriptive user agent allows servers to correctly identify the client and reduces the likelihood of requests being denied.

A user agent string should include sufficient detail to identify the crawler and provide contact information. For example:

```
AcmeCo Crawler - acme.co - contact@acme.co
```

When adding contact details, avoid using personal identifiers such as your own name or a private email address—especially in a professional or employment context. Instead, use a role-based or organizational contact (e.g., crawler-team@company.com) to protect individual privacy while still enabling communication.

If a crawler behaves unexpectedly—for example, due to misconfiguration or implementation errors—server administrators can use the information in the user agent to contact the operator and coordinate an appropriate resolution.

The `User-Agent` header can be set on individual requests or applied globally by configuring a custom dispatcher.

**Example: setting a `User-Agent` per request**

```js
import { fetch } from 'undici'

const headers = {
  'User-Agent': 'AcmeCo Crawler - acme.co - contact@acme.co'
}

const res = await fetch('https://example.com', { headers })
```

## Best Practices for Crawlers

When developing a crawler, the following practices are recommended in addition to setting a descriptive `User-Agent` header:

* **Respect `robots.txt`**
  Follow the directives defined in the target site’s `robots.txt` file, including disallowed paths and optional crawl-delay settings (see [W3C guidelines](https://www.w3.org/wiki/Write_Web_Crawler)).

* **Rate limiting**
  Regulate request frequency to avoid imposing excessive load on servers. Introduce delays between requests or limit the number of concurrent requests. The W3C suggests at least one second between requests.

* **Error handling**
  Implement retry logic with exponential backoff for transient failures, and stop requests when persistent errors occur (e.g., HTTP 403 or 429).

* **Monitoring and logging**
  Track request volume, response codes, and error rates to detect misbehavior and address issues proactively.

* **Contact information**
  Always include valid and current contact details in the `User-Agent` string so that administrators can reach the crawler operator if necessary.

## References and Further Reading

* [RFC 9309: The Robots Exclusion Protocol](https://datatracker.ietf.org/doc/html/rfc9309)
* [W3C Wiki: Write Web Crawler](https://www.w3.org/wiki/Write_Web_Crawler)
* [Ethical Web Crawling (WWW 2010 Conference Paper)](https://archives.iw3c2.org/www2010/proceedings/www/p1101.pdf)
