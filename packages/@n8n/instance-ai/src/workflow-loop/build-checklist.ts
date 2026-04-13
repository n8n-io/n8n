import type { TaskItem } from '@n8n/api-types';

export type ChecklistPhase = 'building' | 'built' | 'setup' | 'testing' | 'tested' | 'done';

export interface ChecklistOptions {
	needsSetup?: boolean;
	/** Override the default setup step label (e.g. "Set up OpenAI credential"). */
	setupDescription?: string;
	/** Override the default test step label. */
	testDescription?: string;
	/** Override the default publish step label. */
	publishDescription?: string;
}

function resolveStatus(
	taskPhase: ChecklistPhase,
	currentPhase: ChecklistPhase,
	todoWhenPhaseIn: ChecklistPhase[],
): TaskItem['status'] {
	if (taskPhase === currentPhase) return 'in_progress';
	if (todoWhenPhaseIn.includes(currentPhase)) return 'todo';
	return 'done';
}

function defaultTestDescription(needsSetup: boolean): string {
	return needsSetup ? 'Test workflow after setup' : 'Test workflow after build';
}

export function generateBuildChecklist(
	phase: ChecklistPhase,
	options?: ChecklistOptions,
): TaskItem[] {
	const needsSetup = options?.needsSetup ?? false;

	const tasks: TaskItem[] = [
		{
			id: 'build',
			description: 'Build workflow',
			status: phase === 'building' ? 'in_progress' : 'done',
		},
	];

	if (needsSetup) {
		tasks.push({
			id: 'setup',
			description: options?.setupDescription ?? 'Set up credentials & triggers',
			status: resolveStatus('setup', phase, ['building', 'built']),
		});
	}

	const testPriorPhases: ChecklistPhase[] = needsSetup
		? ['building', 'built', 'setup']
		: ['building', 'built'];
	tasks.push({
		id: 'test',
		description: options?.testDescription ?? defaultTestDescription(needsSetup),
		status: resolveStatus('testing', phase, testPriorPhases),
	});

	tasks.push({
		id: 'publish',
		description: options?.publishDescription ?? 'Publish when ready',
		status: phase === 'done' ? 'done' : 'todo',
	});

	return tasks;
}
