import { UserError } from 'n8n-workflow';

type FailureReason = 'python' | 'venv';

const REASONS: Record<FailureReason, string> = {
	python: 'Python 3 is missing from this system',
	venv: 'Virtual environment is missing from this system',
};

export class PythonRunnerUnavailableError extends UserError {
	constructor(reason?: FailureReason) {
		const message = reason
			? `Python runner unavailable: ${REASONS[reason]}`
			: 'Python runner unavailable';

		super(message, {
			description:
				'Internal mode is intended only for debugging. For production, deploy in external mode: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode',
		});
	}
}
