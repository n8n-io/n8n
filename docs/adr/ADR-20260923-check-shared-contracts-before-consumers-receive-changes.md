# Check shared contracts before consumers receive changes

Date: 2026-09-23

Status: Active

Decision Owner: Developer Platform

Source: https://github.com/n8n-io/n8n/pull/36252

## Context

Some consumers keep data or use an older n8n version after a shared contract changes. A current
build can pass even when these consumers cannot use the new contract. Different contracts need
different checks. A schema comparison cannot show whether an existing guarantee still holds.

We need to detect incompatible changes before they reach existing consumers. Each check needs
access to the contract and the output it verifies.

## Decision

We check changes to shared contracts before consumers receive them. The contract owner defines
which consumers must remain compatible. The check compares the proposed output with a protected
prior contract or a supported consumer. A change in the same pull request cannot replace its own
baseline.

We run each check where its required output exists. A check of built output runs after the build.
A check of independently published data runs before publication.

## Alternatives Considered

- **Use one schema check for every contract.** A schema check cannot detect every change in meaning
  or behaviour.
- **Compare only with the proposed contract.** A change could remove a guarantee and its baseline
  in the same pull request.
- **Check only at release time.** An incompatible change could merge before the check runs.

## Consequences

- Contract owners must name the consumers and prior contract that each check protects.
- Checks run at different stages. Each check must block the change before consumers receive it.
- Some checks need a build or a supported client version.
- An intentional incompatible change needs a migration or a reviewed exception.

## Links

RFC: -

Documentation: -

Related ADRs: -
