# METADATA
# title: Unpinned GitHub Action
# description: |-
#   GitHub Action not pinned to full commit SHA.
#   Pin actions to SHA for supply chain security.
# custom:
#   level: error
package rules.unpinned_action

import data.poutine
import rego.v1

rule := poutine.rule(rego.metadata.chain())

# Match 40-character hex SHA (Git) or 64-character sha256 digest (Docker)
is_sha_pinned(uses) if {
	regex.match(`@(sha256:[a-f0-9]{64}|[a-f0-9]{40})`, uses)
}

# Check if it's a local action (starts with ./)
is_local_action(uses) if {
	startswith(uses, "./")
}

# Check if it's a reusable workflow call
is_reusable_workflow(uses) if {
	contains(uses, ".github/workflows/")
}

results contains poutine.finding(rule, pkg.purl, {
	"path": workflow.path,
	"job": job.id,
	"step": i,
	"details": sprintf("Action '%s' should be pinned to a full commit SHA", [step.uses]),
}) if {
	pkg := input.packages[_]
	workflow := pkg.github_actions_workflows[_]
	job := workflow.jobs[_]
	step := job.steps[i]
	step.uses
	not is_sha_pinned(step.uses)
	not is_local_action(step.uses)
}
