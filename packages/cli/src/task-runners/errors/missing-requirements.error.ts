import { UserError } from 'n8n-workflow';

const ERROR_MESSAGE = 'Failed to start Python task runner in internal mode.';

type ReasonId = 'python' | 'venv';

const HINT =
	'Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode';

export class MissingRequirementsError extends UserError {
	constructor(reasonId: ReasonId) {
		const reason = {
			python: 'because Python 3 is missing from this system.',
			venv: 'because its virtual environment is missing from this system.',
		}[reasonId];

		super([ERROR_MESSAGE, reason, HINT].join(' '));
	}
}
