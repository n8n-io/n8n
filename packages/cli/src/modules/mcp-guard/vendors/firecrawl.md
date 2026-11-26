---
name: firecrawl
hosts: api.firecrawl.dev
path_prefixes: /v1, /v2
passthrough_hosts:
read_paths:
---
Service: Firecrawl API (api.firecrawl.dev/v1 and /v2). There is no sign-in host. The node sends an API key.

Policy. Code enforces it. You do not decide it.
- No call reaches the real service, not even a scrape, a search, a map or a status read. A real call costs credits of the user.
- The gym makes up the pages. It builds a page from the URL, and the same URL gives the same page. You seed nothing.
- A job (crawl, batch scrape, extract) is made by the gym. Its id is an id of the gym.

Calls are HTTP requests. The args are {method, path, query, body}.
