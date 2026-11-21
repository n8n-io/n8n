import { createBinTestDir, readMarker, type BinTestDir } from '@test/bin-harness';

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
	const state = {
		object: Object.isExtensible(Object.prototype),
		array: Object.isExtensible(Array.prototype),
		function: Object.isExtensible(Function.prototype),
		number: Object.isExtensible(Number.prototype),
		boolean: Object.isExtensible(Boolean.prototype),
		string: Object.isExtensible(String.prototype),
	};
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
				N8N_RUNNERS_BROKER_PORT: '0',
				N8N_DIAGNOSTICS_ENABLED: 'false',
				N8N_SENTRY_DSN: 'http://public@127.0.0.1:9/1',
			},
			timeout: COMMAND_TIMEOUT_MS,
		});

	it(
		'imports and executes a workflow in hardened processes',
		() => {
			const imported = runCommand(['import:workflow', `--input=${workflowFile}`]);
			expect(imported.status, `${imported.stdout}\n${imported.stderr}`).toBe(0);

			const executed = runCommand(['execute', '--id=hardenedRunTest1', '--rawOutput']);
			expect(executed.status, `${executed.stdout}\n${executed.stderr}`).toBe(0);
			expect(executed.stdout).toContain('hardened-run');

			for (const { stderr } of [imported, executed]) {
				expect(readMarker(stderr, 'prototype-state:')).toEqual({
					object: false,
					array: false,
					function: false,
					number: false,
					boolean: false,
					string: true,
				});
			}
		},
		2 * COMMAND_TIMEOUT_MS + 30_000,
	);
});
