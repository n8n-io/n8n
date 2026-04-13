import type { TaskItem } from '@n8n/api-types';

import { generateBuildChecklist } from '../build-checklist';

function findTask(tasks: TaskItem[], id: string): TaskItem {
	const task = tasks.find((t) => t.id === id);
	if (!task) throw new Error(`Task "${id}" not found`);
	return task;
}

describe('generateBuildChecklist', () => {
	describe('building phase', () => {
		it('should return build=in_progress, test=todo, publish=todo', () => {
			const tasks = generateBuildChecklist('building');
			expect(tasks).toHaveLength(3);
			expect(findTask(tasks, 'build').status).toBe('in_progress');
			expect(findTask(tasks, 'test').status).toBe('todo');
			expect(findTask(tasks, 'publish').status).toBe('todo');
		});

		it('should not include setup step by default', () => {
			const tasks = generateBuildChecklist('building');
			expect(tasks.find((t) => t.id === 'setup')).toBeUndefined();
		});
	});

	describe('built phase', () => {
		it('should return build=done, test=todo, publish=todo', () => {
			const tasks = generateBuildChecklist('built');
			expect(findTask(tasks, 'build').status).toBe('done');
			expect(findTask(tasks, 'test').status).toBe('todo');
			expect(findTask(tasks, 'publish').status).toBe('todo');
		});
	});

	describe('setup phase (needsSetup=true)', () => {
		it('should insert setup step between build and test', () => {
			const tasks = generateBuildChecklist('setup', { needsSetup: true });
			expect(tasks).toHaveLength(4);
			expect(tasks[0].id).toBe('build');
			expect(tasks[1].id).toBe('setup');
			expect(tasks[2].id).toBe('test');
			expect(tasks[3].id).toBe('publish');
		});

		it('should return build=done, setup=in_progress, test=todo, publish=todo', () => {
			const tasks = generateBuildChecklist('setup', { needsSetup: true });
			expect(findTask(tasks, 'build').status).toBe('done');
			expect(findTask(tasks, 'setup').status).toBe('in_progress');
			expect(findTask(tasks, 'test').status).toBe('todo');
			expect(findTask(tasks, 'publish').status).toBe('todo');
		});
	});

	describe('building phase with needsSetup=true', () => {
		it('should return setup=todo when still building', () => {
			const tasks = generateBuildChecklist('building', { needsSetup: true });
			expect(findTask(tasks, 'build').status).toBe('in_progress');
			expect(findTask(tasks, 'setup').status).toBe('todo');
			expect(findTask(tasks, 'test').status).toBe('todo');
		});
	});

	describe('testing phase', () => {
		it('should return build=done, test=in_progress, publish=todo', () => {
			const tasks = generateBuildChecklist('testing');
			expect(findTask(tasks, 'build').status).toBe('done');
			expect(findTask(tasks, 'test').status).toBe('in_progress');
			expect(findTask(tasks, 'publish').status).toBe('todo');
		});

		it('should return setup=done when needsSetup=true', () => {
			const tasks = generateBuildChecklist('testing', { needsSetup: true });
			expect(findTask(tasks, 'setup').status).toBe('done');
			expect(findTask(tasks, 'test').status).toBe('in_progress');
		});
	});

	describe('tested phase', () => {
		it('should return build=done, test=done, publish=todo', () => {
			const tasks = generateBuildChecklist('tested');
			expect(findTask(tasks, 'build').status).toBe('done');
			expect(findTask(tasks, 'test').status).toBe('done');
			expect(findTask(tasks, 'publish').status).toBe('todo');
		});
	});

	describe('done phase', () => {
		it('should return all tasks as done', () => {
			const tasks = generateBuildChecklist('done');
			expect(findTask(tasks, 'build').status).toBe('done');
			expect(findTask(tasks, 'test').status).toBe('done');
			expect(findTask(tasks, 'publish').status).toBe('done');
		});

		it('should return all tasks as done with needsSetup=true', () => {
			const tasks = generateBuildChecklist('done', { needsSetup: true });
			expect(findTask(tasks, 'build').status).toBe('done');
			expect(findTask(tasks, 'setup').status).toBe('done');
			expect(findTask(tasks, 'test').status).toBe('done');
			expect(findTask(tasks, 'publish').status).toBe('done');
		});
	});

	describe('default descriptions', () => {
		it('should use "Test workflow after build" without setup', () => {
			const tasks = generateBuildChecklist('building');
			expect(findTask(tasks, 'test').description).toBe('Test workflow after build');
		});

		it('should use "Test workflow after setup" when needsSetup=true', () => {
			const tasks = generateBuildChecklist('building', { needsSetup: true });
			expect(findTask(tasks, 'test').description).toBe('Test workflow after setup');
		});

		it('should use "Publish when ready" for publish step', () => {
			const tasks = generateBuildChecklist('building');
			expect(findTask(tasks, 'publish').description).toBe('Publish when ready');
		});
	});

	describe('description overrides', () => {
		it('should allow overriding setup description', () => {
			const tasks = generateBuildChecklist('setup', {
				needsSetup: true,
				setupDescription: 'Set up OpenAI credential',
			});
			expect(findTask(tasks, 'setup').description).toBe('Set up OpenAI credential');
		});

		it('should allow overriding test description', () => {
			const tasks = generateBuildChecklist('testing', {
				testDescription: 'Run workflow with sample data',
			});
			expect(findTask(tasks, 'test').description).toBe('Run workflow with sample data');
		});

		it('should allow overriding publish description', () => {
			const tasks = generateBuildChecklist('tested', {
				publishDescription: 'Activate daily schedule',
			});
			expect(findTask(tasks, 'publish').description).toBe('Activate daily schedule');
		});
	});
});
