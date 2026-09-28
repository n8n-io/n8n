# Use a shared, versioned model catalog delivered through a CDN

Date: 2026-09-28

Status: Active

Decision Owner: Agents team (Robin Braumann)

Source: [RFC: Shared n8n model catalog](https://app.notion.com/p/3e25b6e0c94f81688f70e00a3f6717ee)

## Context

n8n products obtain model information from provider APIs, models.dev, and local
tables. These sources can disagree about capabilities, context limits, and
lifecycle status. Updating one source does not update every consumer.

We need a common dataset and contract. Model data must change independently of
n8n releases. Consumers must retain their product rules and handle temporary
catalog outages.

## Decision

We maintain one reviewed model catalog in `n8n-cloud`. We publish the catalog as
JSON through a CDN. The n8n monorepo provides a shared Catalog Client module.

- **Publication:** A scheduled or manual GitHub Action imports models.dev and
  official provider sources. It maps data into the n8n contract and applies
  maintained additions and corrections. Changes require human review in a pull
  request. After merge, the workflow publishes versioned data artifacts. Reads
  require no authentication and do not trigger upstream imports.
- **Client:** Participating application consumers use the Catalog Client for
  normal model lists and metadata. The client provides types, validation,
  fetching, caching, and default fallback behavior. Consumers can override the
  fallback.
- **Model facts:** Identify each record by inference provider and model ID.
  Capabilities, limits, and lifecycle information describe that provider's
  offering. Preserve unknown values. Missing information must not become
  `false`. A catalog entry does not establish access for a specific credential.
- **Compatibility:** Start with `schemaVersion: 1`. Publish each major schema
  version at a separate CDN path. Preserve existing field names, types, and
  meanings within a major version. New models and optional fields can be added.
  Clients tolerate unfamiliar fields. Breaking changes require a new major
  version. Existing clients keep reading their supported version. Continue
  compatible data updates for supported schema versions. Keep schema versions
  separate from catalog data revisions.
- **Publication checks:** Pin the initial `v1` contract as a compatibility
  baseline. Run contract tests against that baseline before each subsequent
  `v1` publication. Validate upstream data to detect incompatible schema changes.
  Import, validation, or compatibility failures fail the Action and alert the
  owners. Keep the previous catalog available. Use the Action for detection and
  alerts.
- **Backup:** Bundle a snapshot of the reviewed catalog with n8n. Use it when
  neither the CDN nor the cache provides a usable catalog. This includes startup
  before the first successful download. Agents retain provider model-list
  discovery as their BYOK outage fallback.
- **Consumer responsibilities:** Consumers own allowlists, defaults,
  recommendations, and access rules. They decide how to handle unknown,
  deprecated, or retired models and missing metadata. This includes warnings,
  selection visibility, model use, and effects on saved agents and workflows.

This centralizes model facts and corrections. Static delivery keeps catalog
updates independent of n8n releases and avoids a dedicated runtime API service.
The shared client provides consistent data access and fallback behavior.

## Alternatives Considered

- **Keep separate catalogs.** Duplicate maintenance and inconsistent facts
  remain.
- **Let each consumer read models.dev or provider APIs.** Each consumer must
  handle mapping, gaps, corrections, upstream changes, and caching.
- **Run a dedicated catalog API service.** This adds operational work. Static
  publication meets the current requirements.
- **Distribute catalog data only with application packages.** Data updates
  depend on application upgrades.

## Consequences

- Robin Braumann and the Agents team maintain the catalog, publishing workflow,
  and Catalog Client. Human review adds time before updates reach consumers.
- A bundled snapshot can be stale. Upstream metadata can be incomplete.
  Consumers own feature behavior when the available data is stale or incomplete.
- Supported schema versions require continued maintenance and compatibility
  checks.
- Consumer teams own incremental adoption. Agents and n8n Assistant adopt the
  client for the catalog paths in scope. Gateway model-monitoring automation
  reads the published catalog. It does not require a runtime client integration.
- Air-gapped support, existing canvas integrations, and a dedicated Chat Hub
  migration are outside this decision's scope.

## Links

- [RFC: Shared n8n model catalog](https://app.notion.com/p/3e25b6e0c94f81688f70e00a3f6717ee)
- [Presentation decision log](https://app.notion.com/p/3e25b6e0c94f81718d88d6a427132cf1)
- Prior art: [Move node popularity updates out of builds and into scheduled pull requests](https://github.com/n8n-io/n8n/pull/21992)
