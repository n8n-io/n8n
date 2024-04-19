import { task, beforeEach } from '../main.js';

beforeEach(async () => {
	console.log('[[[beforeEach]]] for example.tasks.ts');
});

task('[example] Should do something', async () => {
	console.log('Example task 1 executed');
});

task('[example] Should do something else', async () => {
	console.log('Example task 2 executed');
});
