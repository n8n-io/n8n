# Setting Up Infinite Continue Hook System

**IMPORTANT**: When asked to set up the infinite continue hook system for a project, you MUST use this setup script.

## Prerequisites

The global hook must already be configured in `~/.claude/settings.json`. This script only creates TODO.json for projects.

**Expected global configuration:**
```json
{
  "hooks": {
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node /Users/jeremyparker/Desktop/Claude\\ Coding\\ Projects/infinite-continue-stop-hook/stop-hook.js"
      }]
    }]
  }
}
```

## Instructions for Claude Code

### CRITICAL: Use Non-Interactive Mode Only

**WARNING**: You MUST use non-interactive mode. NEVER attempt to use interactive mode or echo responses to prompts.

### When to Use This Script
Use this script when the user asks you to:
- "Set up infinite continue hook"
- "Enable infinite hook for this project"
- "Install the stop hook system"
- "Configure automatic task continuation"
- Any similar request for the infinite continue system

### Required Setup Method

Always use the `--no-interactive` flag with all necessary parameters:

```bash
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --task "Initial task description" \
  --mode "DEVELOPMENT" \
  --prompt "Detailed task instructions"
```

### After Setup: Automatic Task Creation

Once setup completes, the hook system will:
1. **Detect the new TODO.json file** and activate automatically
2. **Switch to TASK_CREATION mode** when you stop Claude Code
3. **Guide you to read** `/development/modes/task-creation.md`
4. **Help you break down** the initial task into manageable subtasks

**Important files created during setup:**
- `/development/general.md` - Universal development guidelines and subagent instructions
- `/development/modes/task-creation.md` - How to create and decompose tasks
- `/development/modes/[mode].md` - Mode-specific instructions for each work type
- `/development/tasks/` - Directory for task-specific documentation

### Examples for Common Scenarios

#### Research Project Setup
```bash
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --task "Research authentication solutions" \
  --mode "RESEARCH" \
  --prompt "Evaluate OAuth2, JWT, session-based auth, and SSO options. Compare security, complexity, and costs."
```

#### Development Project Setup
```bash
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --task "Implement user authentication system" \
  --mode "DEVELOPMENT" \
  --prompt "Build complete auth with login, logout, registration, password reset, and JWT tokens"
```

#### Testing Project Setup
```bash
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --task "Achieve 95% test coverage" \
  --mode "TESTING" \
  --prompt "Write comprehensive unit and integration tests for all modules"
```

#### Refactoring Project Setup
```bash
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --task "Refactor authentication module" \
  --mode "REFACTORING" \
  --prompt "Improve security, reduce complexity, and enhance maintainability" \
  --dependencies "src/auth/,src/models/user.js"
```

### Command Line Options

| Option | Description | Required | Example |
|--------|-------------|----------|---------|
| `--no-interactive` | Run without prompts | **YES** | `--no-interactive` |
| `--task` | Initial task description | **YES** | `--task "Build REST API"` |
| `--mode` | Task mode | **YES** | `--mode "DEVELOPMENT"` |
| `--prompt` | Detailed task instructions | **YES** | `--prompt "Create CRUD endpoints"` |
| `--project-name` | Override project name | No | `--project-name "my-app"` |
| `--dependencies` | Comma-separated dependencies | No | `--dependencies "src/,lib/"` |
| `--important-files` | Files to read first | No | `--important-files "README.md,package.json"` |
| `--requires-research` | Flag for research tasks | No | `--requires-research` |

### What the Script Does

1. **Creates Project Directories**
   - Creates `/development` directory for project-specific guidelines
   - Copies `general.md` (core guidelines) to `/development/general.md`
   - Creates `/development/modes` subdirectory
   - Copies all mode files including `task-creation.md` from the hook system
   - Creates `/development/tasks` directory for task documentation

2. **Creates TODO.json** in the specified project
   - Adds the initial task based on your parameters
   - Includes three review strike tasks automatically
   - Sets up the complete task management structure

3. **Tests the Setup**
   - Runs test-hook.js to verify configuration
   - Shows current TODO.json status
   - Confirms hook will activate on Claude Code stop

### Automatic Workflow After Setup

1. **Setup creates TODO.json** with your initial task
2. **Stop Claude Code** - the hook detects the project and activates
3. **Hook switches to TASK_CREATION mode** for new projects
4. **You read the guidance files**:
   - `/development/general.md` for universal guidelines and subagent usage
   - `/development/modes/task-creation.md` for task decomposition strategies
5. **Create subtasks** using the Task tool as guided
6. **Begin work** on the first subtask with appropriate mode guidance

The system handles all mode switching and guidance automatically!

### Project Directory Structure

After running the setup script, your project will have:

```
your-project/
├── TODO.json                    # Task management file
├── development/                 # Project-specific guidelines
│   ├── general.md               # Core development guidelines
│   ├── tasks/                   # Task-specific documentation
│   └── modes/                   # Mode-specific guidance
│       ├── development.md       # Development mode instructions
│       ├── testing.md           # Testing mode instructions
│       ├── refactoring.md       # Refactoring mode instructions
│       ├── research.md          # Research mode instructions
│       ├── task-creation.md     # Task creation instructions
│       └── ...                  # Other mode files
└── ... (your project files)
```

### Full Example: Complete Project Setup

```bash
# For a new Node.js API project
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --project-name "user-api" \
  --task "Build user management REST API" \
  --mode "DEVELOPMENT" \
  --prompt "Create Express.js API with user CRUD operations, authentication, and role-based access" \
  --dependencies "src/,config/" \
  --important-files "package.json,README.md,src/app.js"
```

### Verification Steps

After running the setup script:

1. **Verify TODO.json was created:**
   ```bash
   cat TODO.json | head -20
   ```

2. **Check development files were copied:**
   ```bash
   ls -la development/
   ls -la development/modes/
   ```

3. **Test the hook activation:**
   ```bash
   node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/test-hook.js"
   ```

### Important Notes

1. **Always use --no-interactive**: Claude must never use interactive mode
2. **All parameters are strings**: Wrap multi-word values in quotes
3. **Mode is case-insensitive**: "DEVELOPMENT", "development", "Development" all work
4. **Hook activates automatically**: Once TODO.json exists, the system is active
5. **Task creation guidance**: The hook will guide you to create subtasks on first run

### Quick Reference

```bash
# Minimal setup (development mode is default if not specified)
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --task "Build the application"

# Research project
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --task "Research best practices" \
  --mode "RESEARCH" \
  --prompt "Analyze current industry standards and recommendations"

# Full setup with all options
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "." \
  --no-interactive \
  --project-name "my-app" \
  --task "Implement complete feature" \
  --mode "DEVELOPMENT" \
  --prompt "Build according to specifications in docs/requirements.md" \
  --dependencies "src/,lib/" \
  --important-files "README.md,package.json,docs/requirements.md" \
  --requires-research
```

---

## Interactive Mode (For Human Users Only)

**WARNING**: This section is for human users only. Claude Code must NEVER use interactive mode.

The interactive mode prompts users for:
- Project name (auto-detected from package.json or directory name)
- Task description
- Task mode (DEVELOPMENT/REFACTORING/TESTING/RESEARCH)
- Detailed task prompt
- Dependencies (optional)
- Important files (optional)
- Whether research is required

To use interactive mode, humans can run:
```bash
node "/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/setup-infinite-hook.js" "."
```

Remember: ALWAYS use this script with --no-interactive when asked to set up the infinite continue hook system.