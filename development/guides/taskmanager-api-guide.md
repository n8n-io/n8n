# TaskManager API Reference Guide

Complete reference for the TaskManager API - a comprehensive task management system designed for Claude Code agents with bash-compatible operations.

## Core Operations

### Basic Task Management

```bash
# Read TODO.json with validation and auto-fix
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.readTodo().then(data => console.log(JSON.stringify(data, null, 2)));"

# Get current active task (first pending or in_progress)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getCurrentTask().then(task => console.log(JSON.stringify(task, null, 2)));"

# Update task status by ID
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.updateTaskStatus('task_id', 'completed').then(() => console.log('Task updated'));"

# Create new task with full schema support
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.createTask({title: 'New Task', description: 'Task description', mode: 'DEVELOPMENT', priority: 'high'}).then(id => console.log('Created task:', id));"
```

### Task Removal Operations

```bash
# Remove a single task by ID
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.removeTask('task_id').then(removed => console.log('Task removed:', removed));"

# Remove multiple tasks at once
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.removeTasks(['task_id1', 'task_id2', 'task_id3']).then(result => console.log('Removal results:', JSON.stringify(result, null, 2)));"
```

### Task Reordering Operations

```bash
# Reorder a task to a specific position (0-based index)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.reorderTask('task_id', 2).then(moved => console.log('Task reordered:', moved));"

# Move task to the top of the list
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.moveTaskToTop('task_id').then(moved => console.log('Task moved to top:', moved));"

# Move task to the bottom of the list
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.moveTaskToBottom('task_id').then(moved => console.log('Task moved to bottom:', moved));"

# Move task up one position
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.moveTaskUp('task_id').then(moved => console.log('Task moved up:', moved));"

# Move task down one position
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.moveTaskDown('task_id').then(moved => console.log('Task moved down:', moved));"

# Reorder multiple tasks at once
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.reorderTasks([{taskId: 'task1', newIndex: 0}, {taskId: 'task2', newIndex: 3}]).then(result => console.log('Reorder results:', JSON.stringify(result, null, 2)));"

# Get current position of a task
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); console.log('Task position:', tm.getTaskPosition('task_id'));"
```

### File and Research Management

```bash
# Add important file to task (for task-specific documentation)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.addImportantFile('task_id', './development/research-reports/task-specific-analysis.md').then(added => console.log('Important file added:', added));"

# Remove important file from task
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.removeImportantFile('task_id', './file/path').then(removed => console.log('File removed:', removed));"

# Get research report path for task
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); console.log(tm.getResearchReportPath('task_id'));"

# Check if research report exists
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); console.log(tm.researchReportExists('task_id'));"
```

## Advanced Operations

### Mode and Workflow Management

```bash
# Determine next execution mode based on project state
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.readTodo().then(async (data) => { const mode = await tm.getNextMode(data); console.log('Next mode:', mode); });"

# Check if reviewer should run
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.readTodo().then(data => console.log('Should run reviewer:', tm.shouldRunReviewer(data)));"

# Handle strike logic for review system
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.readTodo().then(data => console.log(JSON.stringify(tm.handleStrikeLogic(data), null, 2)));"
```

### Validation and Recovery

```bash
# Validate TODO.json without modifications
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.validateTodoFile().then(result => console.log(JSON.stringify(result, null, 2)));"

# Get detailed file status
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getFileStatus().then(status => console.log(JSON.stringify(status, null, 2)));"

# Perform auto-fix on TODO.json
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.performAutoFix().then(result => console.log(JSON.stringify(result, null, 2)));"

# Dry run auto-fix (preview changes)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.dryRunAutoFix().then(result => console.log(JSON.stringify(result, null, 2)));"
```

### Backup Management

```bash
# List available backups
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.listBackups().then(backups => console.log(JSON.stringify(backups, null, 2)));"

# Create manual backup
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.createBackup().then(result => console.log(JSON.stringify(result, null, 2)));"

# Restore from backup
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.restoreFromBackup().then(result => console.log(JSON.stringify(result, null, 2)));"

# Clean up legacy backups
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.cleanupLegacyBackups().then(result => console.log(JSON.stringify(result, null, 2)));"
```

## Enhanced Features

### Dependency Management

```bash
# Build dependency graph with text visualization
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.buildDependencyGraph().then(graph => console.log(graph.tree));"

# Get dependency report in markdown format
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.generateDependencyReport().then(report => console.log(report));"

# Get executable tasks (no unmet dependencies)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getExecutableTasks().then(tasks => console.log(JSON.stringify(tasks.map(t => ({id: t.id, title: t.title, status: t.status})), null, 2)));"
```

### Executable Quality Gates

```bash
# Execute quality gates for a task
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.executeQualityGates('task_id').then(result => console.log(JSON.stringify(result, null, 2)));"

# Add executable quality gate to task
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.addQualityGate('task_id', 'npm run lint').then(added => console.log('Quality gate added:', added));"
```

#### Supported Quality Gate Types

- **npm/node commands**: `npm run lint`, `npm test`, `node script.js`
- **File existence**: `file exists: ./path/to/file`
- **Coverage thresholds**: `coverage > 80%`
- **Predefined checks**: `tests pass`, `lint passes`

### Batch Operations

```bash
# Batch update multiple tasks
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.batchUpdateTasks([{taskId: 'task1', field: 'status', value: 'completed'}, {taskId: 'task2', field: 'priority', value: 'high'}]).then(result => console.log(JSON.stringify(result, null, 2)));"
```

### Task Filtering and Querying

```bash
# Query tasks with filters
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.queryTasks({status: 'pending', priority: 'high'}).then(tasks => console.log(JSON.stringify(tasks.map(t => ({id: t.id, title: t.title})), null, 2)));"

# Available filter options:
# - status: 'pending', 'in_progress', 'completed', 'blocked'
# - priority: 'low', 'medium', 'high'
# - mode: 'DEVELOPMENT', 'TESTING', 'RESEARCH', etc.
# - hasFile: string to match in important_files
# - titleContains: string to search in task titles
```

### Task Templates

```bash
# Create task from template
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.createTaskFromTemplate('bug-fix', {bugDescription: 'Login fails on mobile', priority: 'high'}).then(id => console.log('Created task:', id));"
```

#### Available Templates

- **bug-fix**: Bug investigation and resolution
- **feature**: New feature implementation  
- **refactor**: Code refactoring tasks
- **research**: Research and analysis tasks

### Error Tracking

```bash
# Track task error
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.trackTaskError('task_id', {type: 'test_failure', message: 'Unit tests failing', blocking: true}).then(tracked => console.log('Error tracked:', tracked));"

# Get error summary
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getErrorSummary().then(summary => console.log(JSON.stringify(summary, null, 2)));"

# Get errors for specific task
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getErrorSummary('task_id').then(errors => console.log(JSON.stringify(errors, null, 2)));"
```

### Completed Task Archiving (DONE.json)

```bash
# View completed tasks from DONE.json
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.readDone().then(data => console.log(JSON.stringify(data, null, 2)));"

# Get recent completed tasks (last 10)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getCompletedTasks({limit: 10}).then(tasks => console.log(JSON.stringify(tasks.map(t => ({id: t.id, title: t.title, completed_at: t.completed_at})), null, 2)));"

# Get completed tasks from last 7 days
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); tm.getCompletedTasks({since: sevenDaysAgo}).then(tasks => console.log('Completed last 7 days:', tasks.length));"

# Get completion statistics
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getCompletionStats().then(stats => console.log(JSON.stringify(stats, null, 2)));"

# Restore a completed task back to TODO.json
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.restoreCompletedTask('task_id').then(restored => console.log('Task restored:', restored));"

# Migrate all existing completed tasks from TODO.json to DONE.json (one-time setup)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.migrateCompletedTasks().then(result => console.log('Migration results:', JSON.stringify(result, null, 2)));"
```

#### Automatic Archiving Behavior

When a task status is updated to 'completed':
- Task is automatically moved from TODO.json to DONE.json
- Completion timestamp (`completed_at`) is added
- Task is removed from TODO.json to keep it focused on active work
- Archive metadata tracks source file and completion details

#### DONE.json Structure

```javascript
{
  project: "infinite-continue-stop-hook",
  completed_tasks: [
    {
      // Original task properties plus:
      completed_at: "2025-08-07T04:55:19.628Z",
      archived_from_todo: "./TODO.json"
    }
  ],
  total_completed: 149,
  last_completion: "2025-08-07T04:55:19.628Z",
  created_at: "2025-08-07T04:55:04.024Z"
}
```

## Task Schema

### Complete Task Object Structure

```javascript
{
  id: "task_timestamp_randomstring",        // Auto-generated unique ID
  title: "Task Title",                      // Required: Brief task description
  description: "Detailed description",     // Required: Full task details
  mode: "DEVELOPMENT",                      // Required: Execution mode
  priority: "medium",                       // Optional: low|medium|high (default: medium)
  status: "pending",                        // Optional: pending|in_progress|completed|blocked (default: pending)
  dependencies: ["task_id1", "task_id2"],  // Optional: Array of task IDs this depends on
  important_files: ["./file1", "./file2"], // Optional: Relevant file paths
  success_criteria: ["criteria1", "cmd"],  // Optional: Completion criteria (can be executable)
  estimate: "2-3 hours",                    // Optional: Time estimate
  requires_research: false,                 // Optional: Research phase required
  subtasks: [],                             // Optional: Array of subtask objects
  created_at: "2024-08-05T10:00:00.000Z",  // Auto-generated: ISO timestamp
  errors: [],                               // Auto-managed: Error tracking array
  // Special task type flags (auto-set):
  is_linter_task: false,                    // Linter-related task
  is_quality_improvement_task: false,       // Quality improvement task
  linter_summary: {}                        // Linter error summary (if applicable)
}
```

### TODO.json Structure

```javascript
{
  project: "Project Name",                  // Project identifier
  tasks: [],                                // Array of task objects
  current_mode: "DEVELOPMENT",              // Current execution mode
  last_mode: "TASK_CREATION",               // Previous execution mode
  execution_count: 42,                      // Hook execution counter
  review_strikes: 2,                        // Review system strike count (0-3)
  strikes_completed_last_run: false,        // Strike completion flag
  last_hook_activation: 1754375000000       // Timestamp of last hook activation
}
```

## Integration Patterns

### Claude Code Bash Integration

All TaskManager operations are designed for bash execution:

```bash
# Template for TaskManager operations
node -e "
const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager');
const tm = new TaskManager('./TODO.json');
tm.METHOD_NAME(PARAMETERS).then(result => {
  console.log(JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Error:', error.message);
});
"
```

### Error Handling

All methods include comprehensive error handling:
- File corruption recovery via AutoFixer
- Atomic write operations with backups  
- Graceful fallback for missing dependencies
- Detailed error reporting with context

### Performance Considerations

- Atomic file operations prevent corruption
- Backup creation before modifications
- Efficient dependency graph algorithms
- Minimal memory footprint for large task sets

## Quick Reference

### Most Common Operations

```bash
# Get current task to work on
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getCurrentTask().then(task => console.log(task ? task.title : 'No active tasks'));"

# Mark current task as completed
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getCurrentTask().then(async task => { if(task) { await tm.updateTaskStatus(task.id, 'completed'); console.log('Task completed:', task.title); } });"

# Create new development task quickly  
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.createTask({title: 'Quick Task', description: 'Task description', mode: 'DEVELOPMENT'}).then(id => console.log('Created:', id));"

# Check what tasks are ready to execute
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.getExecutableTasks().then(tasks => console.log('Ready to execute:', tasks.length, 'tasks'));"

# Remove a task by ID  
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.removeTask('task_id').then(removed => console.log('Task removed:', removed));"

# Move task to top priority (beginning of list)
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.moveTaskToTop('task_id').then(moved => console.log('Task prioritized:', moved));"

# Move task up one position
node -e "const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.moveTaskUp('task_id').then(moved => console.log('Task moved up:', moved));"
```

This comprehensive API provides all the functionality needed for sophisticated task management in Claude Code agent workflows, with full bash compatibility and robust error handling.