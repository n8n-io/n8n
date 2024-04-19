import { getAllUsers } from '../db/users.js';
import { task, beforeEach } from '../main.js';

beforeEach(async () => {
	console.log('[[[beforeEach]]] for webhook.tasks.ts');
});

task('Production workflow with webhook node that responds immediately', async () => {
	const users = await getAllUsers();
	console.log('users', users);
	console.log('[first] Task 1 executed');
});

task('[first] Task 2 should do something else', async () => {
	console.log('[first] Task 2 executed');
});
