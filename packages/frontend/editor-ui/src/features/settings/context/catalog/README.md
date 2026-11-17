# Skills catalog

The catalog is a fixed selection in the editor bundle. Browsing it does not read
Skills.sh or GitHub. A user selects a skill and reviews the GitHub content before
import. Catalog changes ship with n8n releases. Existing source update checks
continue to work through Skill Sync.

## Selection reviewed on November 17, 2026

`skillCatalog.ts` records each source, reviewed commit, category, and requirement.
Community install counts and ranks come from the
[Skills.sh all-time leaderboard](https://skills.sh/). They are a dated snapshot.
The ten community entries are a reviewed selection from that leaderboard.
Popularity alone does not establish compatibility.

| Source | Selection | License |
| --- | --- | --- |
| [n8n-io/skills](https://github.com/n8n-io/skills) | 14 workflow and agent skills | Apache-2.0 |
| [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Frontend design | Apache-2.0 |
| [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman/tree/main/skills/caveman) | Concise responses | Apache-2.0 |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | Copywriting, SEO audit, marketing psychology, content strategy, AI SEO, copy editing, programmatic SEO, and marketing ideas | MIT |

The n8n routing skill is not an independent capability. The catalog lists its
14 capability skills directly. n8n skills require the corresponding workflow or
agent tools. Content skills accept material supplied in the conversation.
Applying code, browsing sites, and external actions require suitable tools.

Higher-ranked candidates often require a local CLI, a coding repository, a
specific browser integration, or a subagent runtime. Such requirements can make
a skill unsuitable for this catalog. Reassess them when n8n supports those tools.

## Import review

The skill model holds `SKILL.md` and Markdown reference files. Review the
complete source folder before adding an entry. Check its instructions, reference
links, tool requirements, license notices, and parser limits. Record the source
commit. Do not execute scripts from a candidate repository during this review.

The server retains applicable license and notice files in a Markdown reference.
Those notices remain in exported content and take part in update review.

`allowedSkippedFiles` lists exact paths reviewed as development-only material.
The Caveman README and marketing evaluation fixtures are not runtime inputs.
The import preview still lists them. Any other omitted file blocks the catalog
import. The server checks this again against the content it imports.

A GitHub branch can change after catalog review. The import dialog shows the
current content. Source updates still require review after installation.

A second selection from the same repository reuses a connection only when its
scope, branch, and credential match. It cannot import an already linked folder
again, even when the installed skill has a different name.

## Reference examples

The GitHub reader converts JSON and TypeScript files under `references/` to
Markdown code blocks. For example, `references/workflow.json` becomes
`references/workflow.json.md`. The wrapper identifies the original file.
Local Markdown links and inline file names point to the converted paths.
The reader preserves the example text and does not run it. Scripts, assets,
and other file formats remain unsupported.

Initial imports and update checks use the same reader. Converted references
remain subject to the existing file count, size, and content checks. A conflict
with an existing Markdown file rejects the read. This prevents an overwrite.

The official AI nodes and error-handling skills use this conversion. Their
content comes from n8n-io/skills when the user imports them. There are no vendored
copies or runtime content imports in the catalog bundle.

## Guide-based skills

The two new skills live under `content/` in this directory. Their catalog links
point to these folders on n8n-io/n8n's master branch. The links become available
when this change merges. They use the same import, scope, permission, and update
review flows as every other catalog entry.

The workflow-tidying skill retains the MIT notice from its guide. The memory
skill includes the repository license. Tests read these source files locally;
the production editor bundle contains only their catalog metadata.

The current GitHub reader downloads a repository archive even for a folder
link. The n8n archive was about 64 MB at review and fits the existing 512 MB
download limit. Source update checks can download it again after changes to
master. A later move to n8n-io/skills can reduce that transfer, but needs a
migration plan for existing source connections.
