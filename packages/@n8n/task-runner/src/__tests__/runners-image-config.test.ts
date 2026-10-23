import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface RunnerImageConfig {
	'task-runners': Array<{
		'runner-type': string;
		'allowed-env': string[];
	}>;
}

const configPath = resolve(__dirname, '../../../../../docker/images/runners/n8n-task-runners.json');
const config = JSON.parse(readFileSync(configPath, 'utf8')) as RunnerImageConfig;
const jsRunner = config['task-runners'].find((runner) => runner['runner-type'] === 'javascript');

describe('runners image JavaScript configuration', () => {
	it('passes the graceful shutdown timeout to the JavaScript runner', () => {
		expect(jsRunner?.['allowed-env']).toContain('N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT');
	});

	// CAT-4759: The runner must use the same margin as the launcher.
	it('passes the force-kill margin to the JavaScript runner', () => {
		expect(jsRunner?.['allowed-env']).toContain('N8N_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN');
	});
});
