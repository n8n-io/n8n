<!--
The PR title goes into the changelog. Follow the title conventions:
https://github.com/n8n-io/n8n/blob/master/.github/pull_request_title_conventions.md
To keep the PR out of the changelog, add "(no-changelog)" to the end of the title.
To backport a fix for an urgent or high priority bug or a regression, follow the backport conventions:
https://github.com/n8n-io/n8n/blob/master/.github/backport_conventions.md
-->

## Summary

<!--
Write up to three short paragraphs in full sentences:
1. One sentence: what changes and where. Use the imperative mood, for example "Fix the ..." or "Add ...".
2. Why: the product value or the problem, and the rationale for the main choices.
3. Important details, only if needed: unexpected behaviour, technical challenges, rejected alternatives, or insights from the work.
Keep the length in proportion to the complexity of the change.
For UI changes, add screenshots or videos in a table:
| Before | After |
| --- | --- |
| <image or video> | <image or video> |
-->

## How to test

<!--
Write steps that a person follows in the n8n UI or API to see the change work.
Include an example workflow if the changes affect Workflow builder, execution or a Node, that can be tested with a workflow.
If the change needs a feature flag, an environment variable (for example N8N_ENABLED_MODULES), or a license, list them.
Give the command that runs the tests for this change, for example `pnpm agent:test --filter <package> -- <test-file>`.
If there are no tests, write why. A bug fix needs a test that fails without the fix. A feature needs tests.
-->

## Related Linear tickets, Github issues, and Community forum posts

<!--
Include links to **Linear ticket** or Github issue or Community forum post.
Important in order to close *automatically* and provide context to reviewers.
https://linear.app/n8n/issue/[TICKET-ID]
-->
<!-- Use "closes #<issue-number>", "fixes #<issue-number>", or "resolves #<issue-number>" to automatically close issues when the PR is merged. -->
<!-- If the change has docs, link the n8n-docs PR or the docs follow-up ticket. -->
