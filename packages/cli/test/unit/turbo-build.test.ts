import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const cliDir = resolve(__dirname, '..', '..');
const repoRoot = resolve(cliDir, '..', '..');

interface TurboTask {
	dependsOn?: string[];
	with?: string[];
}

const readTurboTask = (id: string): TurboTask | undefined => {
	const file = join(repoRoot, 'turbo.json');
	const { config, error } = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8'));
	if (error) throw new Error(`Cannot parse ${file}`);
	return (config as { tasks: Record<string, TurboTask> }).tasks[id];
};

const workspaceDeps = (): string[] => {
	const manifest = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf8')) as Record<
		string,
		Record<string, string> | undefined
	>;
	const all = {
		...manifest.dependencies,
		...manifest.devDependencies,
		...manifest.optionalDependencies,
	};
	return Object.entries(all)
		.filter(([, version]) => version.startsWith('workspace:'))
		.map(([name]) => name);
};

describe.each(['build', 'build:unchecked'])('turbo task n8n#%s', (name) => {
	const task = readTurboTask(`n8n#${name}`);

	it('waits for each workspace dependency except the editor', () => {
		const expected = workspaceDeps()
			.filter((dep) => dep !== 'n8n-editor-ui')
			.map((dep) => `${dep}#${name}`)
			.sort();

		expect([...(task?.dependsOn ?? [])].sort()).toEqual(expected);
	});

	it('builds the editor in the same run', () => {
		expect(task?.with).toEqual([`n8n-editor-ui#${name}`]);
	});
});
