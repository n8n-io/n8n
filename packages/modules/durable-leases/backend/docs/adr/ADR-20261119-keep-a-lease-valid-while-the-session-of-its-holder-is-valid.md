# Keep a lease valid while the session of its holder is valid

Date: 2026-11-19

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-760

## Context

An instance can hold many leases of one kind at the same time. Each lease must stop being valid
soon after its holder stops, so that another instance can take it over. The database is the source
of truth for which instance holds a lease, and its clock decides when a lease expires.

## Decision

A lease is valid while the session of its holder is valid. An instance keeps one session for each
lease kind that it registers. Only session rows are renewed. A lease row does not have its own
expiry.

The main reason is performance. A session is a batched renewal: one write renews every lease that
the instance holds for the kind.

## Alternatives Considered

1. **Renew each lease row.** We rejected it because each instance would write once for each lease in
   every renewal interval. The load would grow with the number of leases.

## Consequences

1. The renewal load grows with the number of instances and kinds, not with the number of leases.
2. When a session expires or an instance drops it, every lease of that kind on that instance stops
   being valid at the same time.
3. A renewal extends only a session that has not expired, so an expired session never becomes
   valid again. The next session of the instance has a new id.
4. The expiry of a session row uses database time. An instance also ends a session on its own clocks
   when the renewal deadline passes, so a session can end before its row expires.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261120-run-durable-leases-as-a-packaged-backend-module
