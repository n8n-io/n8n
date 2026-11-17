import { createBinTestDir, type BinTestDir } from '@test/bin-harness';

const COMMAND_TIMEOUT_MS = 120_000;

describe('bin/n8n with prototype hardening', () => {
	let testDir: BinTestDir;
	let preload: string;
	let workflowFile: string;

	beforeAll(() => {
		testDir = createBinTestDir('n8n-bin-hardened-');
		preload = testDir.writeFile(
			'report-prototype-on-exit.cjs',
			`process.on('exit', () => {
	const state = { extensible: Object.isExtensible(Object.prototype) };
	require('fs').writeSync(2, 'prototype-state:' + JSON.stringify(state) + '\\n');
});`,
		);
		workflowFile = testDir.writeFile(
			'workflow.json',
			JSON.stringify({
				id: 'hardenedRunTest1',
				name: 'Hardened run',
				nodes: [
					{
						id: 'trigger',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'set',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: {
							assignments: {
								assignments: [
									{ id: 'marker', name: 'marker', value: 'hardened-run', type: 'string' },
								],
							},
						},
					},
				],
				connections: { Manual: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
				settings: {},
			}),
		);
	});

	afterAll(() => {
		testDir.remove();
	});

	// The DSN points at a closed local port, so error reporting starts but sends nothing.
	const runCommand = (args: string[]) =>
		testDir.run(args, {
			preload,
			env: {
				DB_TYPE: 'sqlite',
				N8N_DIAGNOSTICS_ENABLED: 'false',
				N8N_SENTRY_DSN: 'http://public@127.0.0.1:9/1',
			},
			timeout: COMMAND_TIMEOUT_MS,
		});

	it(
		'imports and executes a workflow in hardened processes',
		() => {
			const imported = runCommand(['import:workflow', `--input=${workflowFile}`]);
			expect(imported.status, imported.stderr).toBe(0);

			const executed = runCommand(['execute', '--id=hardenedRunTest1', '--rawOutput']);
			expect(executed.status, executed.stderr).toBe(0);
			expect(executed.stdout).toContain('hardened-run');

			for (const { stderr } of [imported, executed]) {
				expect(stderr).toContain('prototype-state:{"extensible":false}');
			}
		},
		2 * COMMAND_TIMEOUT_MS + 30_000,
	);
});
