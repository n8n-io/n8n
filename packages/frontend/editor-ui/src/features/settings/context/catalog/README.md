# Skills catalog

The catalog is a fixed selection in the editor bundle. Browsing it does not read
Skills.sh or GitHub. Opening a detail page reads public GitHub content through
the existing reader and scanner. Users can browse files before choosing a save
scope. Adding a skill opens the existing GitHub import and review flow.
Catalog changes ship with n8n releases.

Discover, its preview API, and its installed-skill metadata require the `variant`
treatment of `143_recommended_skills`. Skill Sync must also be enabled. New
navigation and add-flow telemetry uses the same experiment gate. Existing skill
and source events still fire without experiment attribution in control.

Installed badges use saved source folders and visible scopes. A renamed synced
skill still matches. Manual copies and skills that stopped syncing have no
catalog badge. The agent picker links to Discover in a new tab.

## Selection reviewed on November 17, 2026

`skillCatalog.ts` records each source, reviewed commit, category, and requirement.
Community install counts and ranks come from the
[Skills.sh all-time leaderboard](https://skills.sh/). They are a dated snapshot.
The ten community entries are a reviewed selection from that leaderboard.
Popularity alone does not establish compatibility.

| Source                                                                                     | Selection                                                                                                                   | License    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| [n8n-io/skills](https://github.com/n8n-io/skills)                                          | 12 workflow and agent skills                                                                                                | Apache-2.0 |
| [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Frontend design                                                                                                             | Apache-2.0 |
| [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman/tree/main/skills/caveman) | Concise responses                                                                                                           | Apache-2.0 |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)          | Copywriting, SEO audit, marketing psychology, content strategy, AI SEO, copy editing, programmatic SEO, and marketing ideas | MIT        |

The n8n routing skill is not an independent capability. The catalog lists
capability skills directly. The AI nodes and error-handling skills are deferred:
they require JSON or TypeScript reference examples that the existing importer
does not store. The catalog does not add file conversion support.

n8n skills require the corresponding workflow or agent tools. Content skills
accept material supplied in the conversation. Applying code, browsing sites,
and external actions require suitable tools. Candidates that require a local
CLI, a coding repository, or a subagent runtime are outside this selection.

## Import review

The skill model holds `SKILL.md` and Markdown reference files. Before adding an
entry, review its complete source folder. Check its reference links, tool
requirements, license notices, and parser limits. Record the source commit.
Do not execute scripts from candidate repositories during this review.

The existing review shows skipped files, including development fixtures. A
GitHub branch can change after catalog review, so the import checks the current
content. Existing source permissions, duplicate rules, and update checks apply.
If the repository is already connected, the dialog offers **View source**.
Importing a sibling outside that source's original folder needs a separate
change to the importer, tracked in [CONTEXT-545](https://linear.app/n8n/issue/CONTEXT-545).
This catalog does not extend source membership or updates.

## Guide-based skills

The two new skills live under `content/`. Their catalog links point to these
folders on n8n-io/n8n's master branch. The links become available after merge.
Until then, their detail pages explain that the source is unavailable and keep
Add disabled. The editor bundle contains only their catalog metadata.

The workflow-tidying skill retains the MIT notice from its guide. The memory
skill includes the repository license. Tests read these source files locally.
