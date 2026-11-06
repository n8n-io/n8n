---
title: Public API
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: SamWooler
---

# Public API

The editor talks to the backend through the REST API under `/rest`. Scripts, CI pipelines, and other tools use a second API, the public API under `/api/v1`. This page explains how the two differ. Read it before you add or change a public endpoint.

The REST API under `/rest` belongs to the editor, and the two change together. The public API is a contract with code outside n8n. A change must not break callers that already exist, also when the code behind an endpoint changes.

Most callers sign in with an API key. A key has its own scopes, a smaller set than the scopes of users. A key never has a scope that the role of its owner lacks.

Each endpoint is a method on a `@PublicApiController` class. The build generates the OpenAPI document from these methods and from the request and response types in `@n8n/api-types`, so a new endpoint describes itself. A lint rule keeps repositories out of public API controllers, so they call services. List endpoints page with cursors, not with page numbers.

`@n8n/cli` is a command line client that uses only the public API. `.agents/skills/public-api/SKILL.md` gives the steps for a new endpoint.

## Quiz

1. Which API can change together with the editor?
   - A. The REST API under `/rest`.
   - B. The public API under `/api/v1`.
   - C. Both.
   - D. Neither.
2. Can an API key have a scope that the role of its owner does not have?
   - A. Yes, if an admin creates the key.
   - B. Yes, for read scopes.
   - C. Only on Cloud.
   - D. No.
3. How do list endpoints of the public API page?
   - A. With page numbers.
   - B. With offsets and limits.
   - C. With cursors.
   - D. They return all rows.
4. A public API controller needs data. What does it call?
   - A. A repository.
   - B. A service.
   - C. A TypeORM query.
   - D. The REST controller.

<details>
<summary>Answers</summary>

1. A. The REST API under `/rest`. The public API is a contract with callers outside n8n. A change must not break them.
2. D. No. A key has its own scopes, a smaller set than the scopes of users.
3. C. With cursors. List endpoints page with cursors, not with page numbers.
4. B. A service. A lint rule keeps repositories out of public API controllers.

</details>
