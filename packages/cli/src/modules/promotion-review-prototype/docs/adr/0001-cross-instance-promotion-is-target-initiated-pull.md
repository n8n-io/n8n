# Cross-instance promotion is target-initiated pull

For promoting workflows between instances (e.g. `dev` → `prd`), the **consuming
instance initiates** the exchange: it holds a scoped, read-only API key for the
producing instance and pulls pending promotion requests and deployables. The
producing instance can never reach into the consuming instance, and the
consuming instance accepts no inbound promotion traffic — all calls are
consuming → producing (outbound from production).

We chose this over source-initiated ("`dev` pushes to `prd`") because `prd` is
the crown jewel: source-initiated would require `dev` to hold a write-capable
credential for production and `prd` to accept inbound connections from the
less-hardened instance. Target-initiated also unifies with how Source Control
pull already works (consuming instance pulls, then applies), so the direct and
git transports share one initiator direction.

## Status

accepted

## Considered options

- **Source-initiated (push):** `dev` pushes promotion requests into `prd`.
  Rejected for v1 — production must accept inbound from dev and dev must hold a
  prod write credential. Kept as a future option for CI/push scenarios.
- **Target-initiated (pull):** chosen.

## Consequences

- The producing instance must be reachable by the consuming instance at pull
  time (for the direct transport). Removing that constraint is a reason to adopt
  an intermediary transport (shared store / git) — see ADR-0002.
- Push-style notification ("a request appeared") is incompatible with pure
  target-initiated direction; it needs a broker/relay. v1 uses manual pull.
- Outcome feedback to the producing instance is only possible as an optional
  `consuming → producing` status callback (off by default to keep the key
  read-only).
