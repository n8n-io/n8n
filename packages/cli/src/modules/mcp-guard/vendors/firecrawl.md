---
name: firecrawl
hosts: api.firecrawl.dev
path_prefixes: /v1, /v2
passthrough_hosts:
read_paths:
- ^/v[12]/scrape$
- ^/v[12]/search$
- ^/v[12]/map$
---
Service: Firecrawl API (api.firecrawl.dev/v1 and /v2). There is no sign-in host. The node sends an API key.

Policy for each call. Code enforces it with "read_paths" above. You do not decide it.
- POST scrape, search, map: a real read. They change no data, and they cost few credits. The real answer comes first, then you copy it into the gym.
- POST crawl, extract, batch/scrape, agent, and every other POST: gym only. They start jobs and they can cost many credits.
- GET (a crawl status, an extract status, the credit usage): a read. A job id that the gym made is answered by the gym only.

Calls are HTTP requests. The tool name tells the kind: "read_post_scrape", "read_post_search", "read_post_map", "write_post_crawl", "read_get_crawl" (a status), and so on. The args are {path, query, body}.

Real result shapes:
- scrape: {success, data: {markdown, html, metadata: {title, description, sourceURL, statusCode}, links}}
- search: {success, data: [{url, title, description, markdown}]} (v2 groups them by source under "data": {web, news, images})
- map: {success, links: ["https://..."]}
- crawl start: {success, id, url}. Crawl status: {status, total, completed, creditsUsed, data: [...]}

The Firecrawl gym has no web data of its own. Copy what the real answer holds. For a scrape, seed one page with the real URL ("metadata.sourceURL"), the title and the text. For a search or a map, seed one page for each result. Do not invent pages, text or links that the real answer lacks.

A crawl or an extract never reaches the real service. The gym makes the job id. Never write an "id" yourself. A later status read with that id goes to the gym only.
