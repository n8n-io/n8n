import { task } from '../main.js';
import { getAllUsers } from '../../integration/shared/db/users.js';

task('Production workflow with webhook node that responds immediately', async () => {
	const users = await getAllUsers();
	console.log('users', users);
	console.log('[first] Task 1 executed');
});

task('[first] Task 2 should do something else', async () => {
	console.log('[first] Task 2 executed');
});
