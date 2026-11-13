# Self-healing settings

This package owns the configuration list and form.
Team projects show the list in Project Settings.
Personal projects show the list on their own Self-healing tab.
The editor shell registers the routes through the existing Instance AI module.
Configuration management requires the existing workflow suggestions flag.
Team projects also require `project:update`.
Only the owner can open the Self-healing tab of a personal project.
The personal form has no reviewer picker. It sets `includeAllProjectMembers` to `true` and saves no individual reviewers.
The owner is the only member of a personal project.
The backend API owns selection conflicts, reviewer eligibility, and lifecycle changes.
New configurations start with `includeSubWorkflows` turned on. The API default stays `false`.
The form shows the sub-workflows of each selected workflow from the workflow dependency index.
It follows only sub-workflows in the project, because a fix cannot change other sub-workflows.
`includeSubWorkflows` reserves no sub-workflow, so the picker does not block a sub-workflow of another selection.
