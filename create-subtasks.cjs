const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager');
const tm = new TaskManager('./TODO.json');

async function createSubtasks() {
  const data = await tm.readTodo();
  
  const subtasks = [
    {
      id: 'analyze-coverage-baseline-' + Date.now(),
      title: 'Analyze Design System Test Coverage Baseline',
      description: 'Run comprehensive coverage analysis to identify specific components with low/missing test coverage and establish improvement priorities',
      mode: 'DEVELOPMENT',
      priority: 'high',
      status: 'pending',
      parent_task_id: 'enhance-design-system-coverage-1754230629258',
      success_criteria: [
        'Coverage baseline report generated with specific percentages per component',
        'Components with low coverage identified and prioritized',
        'Missing test files documented for untested components',
        'Coverage improvement roadmap created with specific targets'
      ],
      important_files: [
        'packages/frontend/@n8n/design-system/coverage-report.json',
        'packages/frontend/@n8n/design-system/src/components/',
        'packages/frontend/@n8n/design-system/vitest.config.ts'
      ],
      estimate: '1-2 hours',
      created_at: new Date().toISOString()
    },
    {
      id: 'test-critical-components-' + Date.now(),
      title: 'Add Tests for Critical UI Components',
      description: 'Focus on testing the most critical components (Button, Input, Select, Alert, etc.) to achieve quick coverage gains for high-impact components',
      mode: 'DEVELOPMENT', 
      priority: 'high',
      status: 'pending',
      parent_task_id: 'enhance-design-system-coverage-1754230629258',
      success_criteria: [
        'N8nButton, N8nInput, N8nSelect components reach 90%+ coverage',
        'N8nAlert, N8nCard, N8nTooltip components fully tested',
        'Component interaction and prop validation tested',
        'All critical user interaction scenarios covered'
      ],
      important_files: [
        'packages/frontend/@n8n/design-system/src/components/N8nButton/',
        'packages/frontend/@n8n/design-system/src/components/N8nInput/',
        'packages/frontend/@n8n/design-system/src/components/N8nSelect/',
        'packages/frontend/@n8n/design-system/src/components/N8nAlert/'
      ],
      estimate: '2-3 hours',
      created_at: new Date().toISOString()
    },
    {
      id: 'test-utility-functions-' + Date.now(),
      title: 'Improve Utility Functions and Directive Test Coverage',
      description: 'Add comprehensive tests for utility functions, directives, and helper modules to improve function coverage from 45% to 70%+',
      mode: 'DEVELOPMENT',
      priority: 'medium', 
      status: 'pending',
      parent_task_id: 'enhance-design-system-coverage-1754230629258',
      success_criteria: [
        'All utility functions in src/utils/ reach 80%+ coverage',
        'Directive functions (n8n-html, n8n-truncate, etc.) fully tested',
        'Helper functions and type guards comprehensively tested',
        'Function coverage increases from 45% to 70%+'
      ],
      important_files: [
        'packages/frontend/@n8n/design-system/src/utils/',
        'packages/frontend/@n8n/design-system/src/directives/',
        'packages/frontend/@n8n/design-system/src/composables/'
      ],
      estimate: '1-2 hours',
      created_at: new Date().toISOString()
    }
  ];
  
  // Add subtasks to the parent task
  const parentTaskIndex = data.tasks.findIndex(t => t.id === 'enhance-design-system-coverage-1754230629258');
  if (parentTaskIndex !== -1) {
    if (!data.tasks[parentTaskIndex].subtasks) {
      data.tasks[parentTaskIndex].subtasks = [];
    }
    data.tasks[parentTaskIndex].subtasks.push(...subtasks);
  }
  
  // Also add as top-level tasks for easier tracking
  data.tasks.push(...subtasks);
  
  await tm.writeTodo(data);
  console.log('✅ Created 3 subtasks for design system coverage improvement');
  console.log('Subtasks:', subtasks.map(t => t.title));
}

createSubtasks().catch(console.error);