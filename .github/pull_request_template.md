<!--
The PR title goes into the changelog. Follow the title conventions:
https://github.com/n8n-io/n8n/blob/master/.github/pull_request_title_conventions.md
To keep the PR out of the changelog, add "(no-changelog)" to the end of the title.
To backport an urgent fix, add the label "Backport to Beta", "Backport to Stable", or "Backport to v1".
-->

## Summary

<!--
Start with 1 to 3 sentences of background for a new reader. Then describe what the PR does, in prose, not as a list of edits.
Add screenshots or videos for UI changes.
-->

## Why

<!--
State the problem or the constraint that makes the current code unfit. Do not repeat the Summary.
Add a rejected alternative only when a reviewer would ask about it, in one or two sentences.
-->

## How to test

<!--
Write steps that a person follows in the n8n UI or API to see the change work.
Include an example workflow if the changes affect Workflow builder, execution or a Node, that can be tested with a workflow.
If the change needs a feature flag, an environment variable (for example N8N_ENABLED_MODULES), or a license, list them.
-->

Test command: <!-- Give the command that runs the tests for this change, for example `pnpm agent:test --filter <package> -- <test-file>`. If there are no tests, write why. A bug fix needs a test that fails without the fix. A feature needs tests. -->

## Related Linear tickets, Github issues, and Community forum posts

<!--
Include links to **Linear ticket** or Github issue or Community forum post.
Important in order to close *automatically* and provide context to reviewers.
https://linear.app/n8n/issue/[TICKET-ID]
-->
<!-- Use "closes #<issue-number>", "fixes #<issue-number>", or "resolves #<issue-number>" to automatically close issues when the PR is merged. -->

Docs: <!-- Link the n8n-docs PR or the follow-up ticket, or write "none needed". -->
