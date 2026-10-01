# Check shared contracts before consumers receive changes

Date: 2026-09-23

Status: Active

Decision Owner: Developer Platform

Source: https://github.com/n8n-io/n8n/pull/36252

## Context

Shared contracts are guarantees that consumers depend on after the producer changes. Existing
credentials depend on OAuth scopes granted before the change. The proposed model catalog will
publish new data to clients on older n8n versions. A current build can pass even when those
consumers cannot use the changed contract.

We need to detect incompatible changes before they reach existing consumers. A schema comparison
cannot show whether every guarantee still holds.

## Decision

We require a blocking compatibility check before consumers receive a changed shared contract. The
owner identifies the supported consumers and the guarantee the check protects. The check verifies
that the proposed change preserves that guarantee for those consumers.

We run the check where its required output exists. A check of built output runs after the build. A
check of independently published data runs before publication.

## Alternatives Considered

- **Use one schema check for every contract.** A schema check cannot detect every change in meaning
  or behaviour.
- **Treat a passing build as proof of compatibility.** A build cannot show whether existing
  consumers still work.
- **Check only at release time.** An incompatible change could merge before the check runs.

## Consequences

- Each check identifies the consumers and guarantee it protects.
- Checks run at different stages. Each check must block the change before consumers receive it.
- Some checks need a build or a supported client version.
- An intentional incompatible change needs a migration or a reviewed exception.

## Links

RFC: -

Documentation: -

Related ADRs: -
