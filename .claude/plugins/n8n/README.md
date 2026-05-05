# n8n Claude Code Plugin

Shared skills, commands, and agents for n8n development. All items are
namespaced under `n8n:` to avoid collisions with personal or third-party
plugins.

## Usage in Claude Code

Skills, commands, and agents are auto-discovered by Claude Code from this
plugin directory. Everything gets the `n8n:` namespace prefix automatically.

| Type | Example | Invocation |
|------|---------|------------|
| Skill | `skills/create-pr/SKILL.md` | `n8n:create-pr` |
| Command | `commands/plan.md` | `/n8n:plan PAY-XXX` |
| Agent | `agents/developer.md` | `n8n:developer` |

## Usage in Cursor

Cursor does **not** auto-discover plugins from `.claude/plugins/`. You need
to register the plugin once by adding an `"n8n@n8n"` entry to
`~/.claude/plugins/installed_plugins.json` (create the file if it doesn't
exist):

```jsonc
{
  "plugins": {
    "n8n@n8n": [
      {
        "scope": "project",
        "installPath": "/absolute/path/to/your/n8n/.claude/plugins/n8n",
        "projectPath": "/absolute/path/to/your/n8n",
        "version": "1.0.0",
        "installedAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

Replace both paths with wherever you have the repo cloned, then restart
Cursor. Skills will appear without the `n8n:` namespace prefix. Since the
path points to the repo, new skills are picked up automatically after
`git pull`.

## Plugin Structure

```
.claude/plugins/n8n/
├── .claude-plugin/
│   ├── marketplace.json    # Marketplace manifest
│   └── plugin.json         # Plugin identity
├── agents/
│   └── <name>.md           # → n8n:<name> agent
├── commands/
│   └── <name>.md           # → /n8n:<name> command
├── skills/
│   └── <name>/SKILL.md     # → n8n:<name> skill
└── README.md
```

## Design Decisions

### Why a plugin instead of standalone skills?

To get the `n8n:` namespace prefix, avoiding collisions with personal or
third-party plugins. Claude Code only supports colon-namespaced items through
the plugin system — standalone `.claude/skills/` entries cannot be namespaced.

### Known Issues

- Plugin skill namespacing requires omitting the `name` field from SKILL.md
  frontmatter due to a [Claude Code bug](https://github.com/anthropics/claude-code/issues/17271).
  The directory name is used as the skill identifier instead.
