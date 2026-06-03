# Agent Skills

Shared n8n skills live in `.agents/skills`. These are the canonical source for
skills that should work across Claude Code, OpenCode, and future agent harnesses.

## Layout

- Shared skills: `.agents/skills/<name>/SKILL.md`
- Claude-specific skills and overrides: `.claude/plugins/n8n/skills/<name>/`
- OpenCode-specific skills and overrides: `.opencode/skills/<name>/`

Claude plugin skills should usually be symlinks back to `.agents/skills`.
OpenCode discovers `.agents/skills` directly, so `.opencode/skills` should only
contain OpenCode-specific real-directory overrides.

Real directories in a harness path are treated as intentional overrides and are
preserved by the sync script.

## Editing

- Edit shared skills under `.agents/skills`, not through symlinked copies.
- Only put a skill in `.agents/skills` if it can work across supported agent
  harnesses. Avoid hardcoded harness tool names, commands, or UI flows unless
  the skill includes a clear availability check and fallback.
- Keep harness-specific commands out of shared skills unless guarded by clear
  tool availability checks.
- Put harness-specific workflows, such as MCP setup commands, in real
  directories under the matching harness path.
- Run `node scripts/sync-agent-skill-links.mjs` after adding or removing shared
  skills to update Claude plugin symlinks.
- Run `node scripts/sync-agent-skill-links.mjs --check` before submitting
  changes.
