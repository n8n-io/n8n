const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager');

async function completeCurrentTask() {
  const tm = new TaskManager('./TODO.json');
  const data = await tm.readTodo();
  
  const currentTask = data.tasks.find(t => 
    t.status === 'in_progress' || 
    (t.status === 'pending' && !data.tasks.some(task => task.status === 'in_progress'))
  );
  
  if (currentTask) {
    await tm.updateTaskStatus(currentTask.id, 'completed');
    console.log('Task marked as completed:', currentTask.title);
  } else {
    console.log('No current task found to complete');
  }
}

completeCurrentTask().catch(console.error);