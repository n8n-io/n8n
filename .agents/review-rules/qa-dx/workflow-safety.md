# GitHub Actions safety

Applies to: `.github/workflows/**`, `.github/actions/**`, `.poutine.yml`.

Poutine and Zizmor already fail CI for the classic hazards — `pull_request_target`
(also an error-level `@n8n/code-health` rule), actions unpinned from a full commit
SHA, untrusted checkout execution, self-hosted runner exposure. Do not repeat
them. What follows is what the scanners cannot see.

## Silencing a scanner is the change to review

`.poutine.yml` carries two allowlists — `github_action_from_unverified_creator_used`
(by purl) and `untrusted_checkout_exec` (by path). The file says "Add new
entries only after security review". Nothing enforces that.

Flag any addition to `.poutine.yml`'s `skip:` block, any new `zizmor: ignore`
comment, and any new entry in `.github/poutine-rules/`'s exceptions. Ask what
was reviewed and why the finding is a false positive rather than a real one.
The entry needs a comment giving the reason, matching the ones already there.

## A gate that cannot fail is not a gate

Required checks are assembled by the `ci-filter` action in `mode: validate`,
fed from a `needs:` list. Flag:

- `continue-on-error: true` on a job that appears in a required-checks `needs:`
  list, or on the final validate step. It makes the gate green regardless of
  outcome. `continue-on-error` on a nightly or a notification step is fine.
- A job removed from a required-checks `needs:` list without the PR saying why.
- `if:` conditions on a required job that can silently skip it. A skipped
  required job and a passing one are hard to tell apart in the merge queue.

## Path filters decide whether a test runs at all

Jobs gated on a `ci-filter` filter only run when a matching file changed, so a
filter that is too narrow means the test quietly stops covering new code. When
a PR adds a directory that an existing filter was meant to cover — a new package
under `packages/testing/`, a new script under `.github/scripts/` — check the
filter still matches it.

## Least privilege

Every workflow declares a top-level `permissions:` block; without one it runs
with the repository's broad default token. Flag a new workflow that omits it,
and a job that widens `permissions` beyond what its steps use. A job calling a
reusable workflow must grant at least what that workflow declares.
