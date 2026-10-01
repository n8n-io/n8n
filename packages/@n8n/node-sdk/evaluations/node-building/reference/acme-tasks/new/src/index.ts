import { createTask } from './actions/task.create';
import { getManyTasks } from './actions/task.get-all';

export { node } from './acme-tasks.node';

export const actions = [getManyTasks, createTask];
