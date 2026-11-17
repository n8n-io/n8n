---
name: n8n:backend-docs-refresh
description: >-
  Checks the backend onboarding pages in docs/backend against the code changes
  since each page was last reviewed, and fixes the statements that are no
  longer true. Use for the monthly docs pass, or when asked to refresh or
  re-check docs/backend.
---

# Refresh the backend docs

The pages in `docs/backend` explain the n8n backend to new engineers. The code
changes every day, so a page can become wrong while nobody edits it. This skill
finds those statements and corrects them.

## When to fix

Each fix costs a reviewer time. Fix a statement only when a reader who trusts
it gets a wrong picture of the backend, or takes a wrong action. For example:

- A file, symbol, or environment variable that the page names moved, got a new
  name, or was removed.
- A flow that the page describes has a step in a different order, a removed
  step, or a new step that changes the result.
- A default, a limit, or a behavior that the page states is different now.
- A feature that the page describes was removed or replaced.

Do not change:

- Wording, style, or structure that is still correct.
- A detail that the page leaves out. The pages simplify on purpose.
- A statement that is still true in substance, where the fix adds detail but
  does not change what the reader understands.
- A new feature or subsystem that no page covers. Do not add pages or
  sections. List it in the [report](#report) instead.

Every fix must name the commit that made the statement wrong. If you cannot
name a commit, do not make the fix. If you are not sure, do not make the fix.
A run that changes nothing is a valid result.

## Procedure

1. Run `git fetch origin master`. Every `git log` below runs on
   `origin/master`, and "the current code" means the code on `origin/master`.
2. For each page in `docs/backend` and `docs/backend/how-to`, read
   `last_reviewed` in the frontmatter.
3. For each page, list the folders of the code that the page describes. Most
   pages name few files, so also find the code for the statements that name no
   code. Step 9 checks that the names in the page exist.
4. For each page, list the commits in those folders since its
   `last_reviewed`:
   `git log origin/master --since=<last_reviewed> --no-merges --format='%h %ad %s' --date=short -- <folders>`.
5. Steps 3 and 4 can miss code that a page describes. So, once for all pages,
   read the subject of every commit outside the frontend since the oldest
   `last_reviewed`. Include the root files, because the pages name root
   `pnpm` scripts:
   `git log origin/master --since=<oldest last_reviewed> --no-merges --format='%h %ad %s' --date=short -- . ':!packages/frontend' ':!packages/testing' ':!docs/backend'`.
   Mark each commit that can change a statement on a page, for example a
   move, a removal, a replacement, or a new default. Note the pages that it
   can change.
6. Ignore commits that change only tests, types, or formatting. Read the diffs
   of the other commits from steps 4 and 5. If a page has no such commits, go
   to the next page.
7. Compare each statement of the page with the current code, not only with the
   diff. Fix the statements that meet the bar in [When to fix](#when-to-fix).
8. Keep the voice of the page. Follow the writing rules in `AGENTS.md` and the
   Vale styles in `docs/backend/styles`. Keep each sentence to 25 words or
   fewer.
9. Run `node scripts/backend-docs-check.mjs`. It must pass. It checks the
   paths, the environment variables, and the symbols in tables with "File"
   and "Symbol" columns. It does not check other symbols in code spans, for
   example decorators and class names. For each of these, confirm with
   `git grep -w -F -e <name> origin/master -- ':!docs/backend' ':!packages/frontend' ':!packages/testing'`
   that the name still exists in the backend. CI
   runs Vale and Lychee on the PR.

Change only files in `docs/backend`.

## Update `last_reviewed`

If at least one page has a fix, set `last_reviewed` to today's date on every
page, also on the pages with no fix. You checked them all, and the date
records that check.

If no page has a fix, change nothing and open no PR.

## Report

Write the report as the PR description. If there is no PR, give the same
report as the final output of the run.

- **Fixes:** one line for each fix, with the page, what was wrong, and the
  short commit hash.
- **Not changed:** one line for each item that a person may want to look at,
  for example a new module that no page covers, or a statement you were not
  sure about. Leave out this section if it is empty.

Do not describe the method, and do not list the pages with no fix. The owners
in `OWNERS` review the PR.
