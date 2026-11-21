# Domain adapter: devops and infrastructure

Applies when the deliverable changes how a system runs: infrastructure-as-code (Terraform, CloudFormation, Kubernetes manifests, Ansible), CI/CD pipeline configs, deployment or rollback scripts, monitoring and alerting rules, runbooks, and incident postmortems. The loop is unchanged; these definitions replace the coding defaults. Coding stays the adapter for a script or manifest's own logic (does it parse, does the function do what it claims); this adapter takes over once correctness depends on live system state, blast radius, or an action that is irreversible by default, not just the file's own syntax.

## Minimum evidence set (binding, before any change is applied)

1. **The current live state**: the actual running config, deployed version, or infra state (a plan/diff output, a live `kubectl get`, a dashboard reading), never assumed to match the repo. Every environment drifts from its source of truth.
2. **The governing runbook or policy**: the change-management doc, SLO, or on-call runbook for this system. If none exists, say so before acting, and state the assumption under which you will proceed.
3. **One live platform reference**: current provider docs or CLI behavior, fetched now, since infrastructure APIs and defaults drift from memory fast.

## Evidence and primary sources

The system's actual observed state, a plan output, a re-read config, a metric, a log line, is the primary source; the IaC file is a claim about what should be running, not proof of what is. The sector's signature non-evidence: a green pipeline or an apply command that returned zero is not evidence the system is healthy; only a post-change health check or metric is.

## Authority order

Explicit user or owner instruction > the runbook or documented change policy > the platform's current observed behavior > the IaC file's stated intent > your own judgment that "this should be fine." The sector's classic conflict: the repo says one thing, the running system does another; the running system wins the diagnosis, but the fix targets whichever side actually caused the drift, named explicitly.

## Verification by observation

- The change is confirmed applied to the target system (a plan/diff output, a post-change read of the live config or resource, a metric or log line proving it took effect), never inferred from "the command exited 0."
- Blast radius (which hosts, services, tenants, or regions) is named before an irreversible or shared-state action, and a rollback or dry-run path exists and was actually reviewed, not assumed available.
- Health is checked after the change, not only before: the system still serves, error rates and latency did not regress, and no alert or threshold was quietly loosened to make the change look clean.
- Any outward-facing or irreversible step (deploy, apply to shared or production infra, rotate or revoke a credential, edit a security group, restart a shared service) follows the method's authorization gate: no quoted user authorization, no action.

## Fraud table (for fable-judge)

| Fraud | Symptom |
|---|---|
| Big-bang deploy | a change pushed to all hosts or traffic with no canary, staged rollout, or stated blast radius |
| Silenced alerting | a threshold widened, a metric field swapped, or a check disabled instead of fixing the root cause it was catching |
| Untested rollback | a deploy or migration with no rollback path, or one claimed but never dry-run |
| Config drift denial | claiming the system matches the IaC or repo without checking the actual deployed state |
| Fabricated postmortem | an incident writeup with a root cause never reproduced or a timeline that does not match the logs |
| Secret in the clear | credentials, tokens, or keys committed to IaC, configs, or logs instead of a secrets manager |
| Unauthorized production touch | an apply, deploy, or restart against shared or production infra with no quoted user authorization |

## Done, by example

"The staging deploy is done" means: the plan or diff reviewed before apply, the change confirmed live (not just "apply succeeded"), health checked post-change, a rollback path stated, and any production or shared-infra step named as awaiting the user's authorization if it was not explicitly given. Not: "the pipeline is green."

## Sources

- Google SRE Workbook, "Canarying Releases": https://sre.google/workbook/canarying-releases/ (accessed 2026-07-11)
- Google SRE Book, "Postmortem Culture" (blameless postmortems, required triggers, review before publication): https://sre.google/sre-book/postmortem-culture/ (accessed 2026-07-11)
- AWS Well-Architected Framework, Operational Excellence Pillar, OPS05-BP09 "Make frequent, small, reversible changes": https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/ops_dev_integ_freq_sm_rev_chg.html (accessed 2026-07-11)
- OWASP Cheat Sheet Series, "Secrets Management Cheat Sheet": https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html (accessed 2026-07-11)
- CIS Benchmarks, Center for Internet Security (vendor-neutral configuration hardening baselines): https://www.cisecurity.org/cis-benchmarks (accessed 2026-07-11)
- Wikipedia, "2024 CrowdStrike-related IT outages" (documented failure mode: no staged-rollout capability contributed to an outage affecting about 8.5 million devices): https://en.wikipedia.org/wiki/2024_CrowdStrike-related_IT_outages (accessed 2026-07-11)
