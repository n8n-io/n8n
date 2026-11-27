# Review rules

DevHub's review agent reads the `REVIEW.md` files of this repository. For a changed file, every `REVIEW.md` from the root down to the directory of the file applies. The nearest one wins.

A `REVIEW.md` holds only what a reviewer needs: what to flag, and what to leave alone.

## UI review

Applies to: changed `.vue`, `.scss` and `.css` files. Skip this rule when the pull request changes none.

Use the skill in `.agents/skills/ui-review/SKILL.md`. Read it and every file in `.agents/skills/ui-review/references/` before you start.

- Report each finding that breaks a rule of a reference, and quote that rule.
- A finding with a score of 80 or more is Important.
- A finding with a score from 50 to 79 is a Nit. The skill tells you to leave those out. For a review, this file wins.
- Leave out a finding with a score below 50.
- Do not use the report format of the skill, and do not put the score into the finding.
