# Backport Conventions

A backport copies a change from `master` to an older release line. A GitHub workflow creates the backport PR. You select the release lines with labels on the original PR.

## When to backport

Backport bugs with urgent or high priority and regression fixes.

## Labels

| Label                | Target branch                                                                  |
|----------------------|--------------------------------------------------------------------------------|
| `Backport to Beta`   | `release-candidate/<major>.<minor>.x` of the version that has the `beta` tag   |
| `Backport to Stable` | `release-candidate/<major>.<minor>.x` of the version that has the `stable` tag |
| `Backport to v1`     | `1.x`                                                                          |

You can add more than one label. The workflow creates one backport PR for each label.

## How a backport works

1. Add the labels to the PR. You can add them before or after the merge.
2. When the PR merges, the `Util: Backport pull request changes` workflow (`backport.yml`) cherry-picks the change to each target branch. The backport PR has the title `<original title> (backport to <branch>)`. When you add a label after the merge, the workflow runs only for that label.
3. If the cherry-pick has no conflicts, the workflow approves the backport PR and enables auto-merge.
4. If the cherry-pick has conflicts, the backport PR is a draft that contains the conflicts. The workflow assigns the original author. The author must fix the conflicts, mark the PR as ready, and merge it.
5. The next patch release of the release line includes the merged backport.

To run a backport again, start the `Util: Backport pull request changes` workflow manually with the number of the original PR.

## Migrations

You can backport a fix that adds a migration. Obey these rules:

- Merge the migration to `master` first. Backport it from there.
- Keep the file name, the class name and the content identical to `master`. TypeORM records a migration by its name. An instance that runs the patch release does not run the migration again when it upgrades. A changed copy makes its database different from the databases of other instances.
- Keep the migration small. Do not rebuild a large table.
- On upgrade, the `master` migrations that are older than the backported migration run after it. Make sure that the backported migration does not depend on them, and that they do not fail when it ran first.

The `migration-backport` code-health rule (CI "Static Analysis") checks the first two rules on PRs into release branches.

## Minor releases

A minor release moves the `stable` tag to the old beta line. The release workflow then updates the labels on open PRs:

- A PR with only `Backport to Beta` also gets `Backport to Stable`.
- A PR with only `Backport to Stable` loses that label.

The workflow adds a comment to each PR that it changes. Merged PRs keep their labels.
