import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { onTestFinished } from 'vitest';

import { copyGitRemote, createFixtureGit, createGitRemoteSeed } from './utils/git-remote-fixture';

it('copies independent remotes and working trees without a dependency on the seed', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'promotion-git-fixture-'));
	onTestFinished(async () => await rm(root, { recursive: true, force: true }));
	const seedRoot = path.join(root, 'seed');
	const seed = await createGitRemoteSeed(seedRoot);
	const originalHead = await seed.git.revparse(['HEAD']);
	expect((await seed.git.raw(['ls-tree', '--name-only', 'HEAD'])).trim()).toBe('README.md');
	expect(
		(await createFixtureGit(seed.bareDir).raw(['symbolic-ref', '--short', 'HEAD'])).trim(),
	).toBe('main');
	const first = await copyGitRemote(seedRoot, path.join(root, 'first'));
	const second = await copyGitRemote(seedRoot, path.join(root, 'second'));
	await rm(seedRoot, { recursive: true, force: true });

	await writeFile(path.join(first.workingDir, 'README.md'), 'First copy\n');
	await first.git.add('README.md');
	await first.git.commit('Update the first copy');
	await first.git.push();

	expect(await createFixtureGit(first.bareDir).revparse(['main'])).not.toBe(originalHead);
	expect(await createFixtureGit(second.bareDir).revparse(['main'])).toBe(originalHead);
	expect(await readFile(path.join(second.workingDir, 'README.md'), 'utf8')).toBe(
		'# n8n promotions test\n',
	);
	await second.git.fetch();
	expect(await second.git.revparse(['origin/main'])).toBe(originalHead);
});

it('ignores personal Git settings when it creates a fixture', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'promotion-git-settings-'));
	onTestFinished(async () => {
		vi.unstubAllEnvs();
		await rm(root, { recursive: true, force: true });
	});
	await writeFile(
		path.join(root, '.gitconfig'),
		'[commit]\n\tgpgsign = true\n[gpg]\n\tprogram = missing-promotion-test-signer\n',
	);
	vi.stubEnv('HOME', root);
	vi.stubEnv('USERPROFILE', root);
	vi.stubEnv('XDG_CONFIG_HOME', root);

	const remote = await createGitRemoteSeed(path.join(root, 'seed'));

	expect((await remote.git.revparse(['HEAD'])).trim()).toMatch(/^[a-f0-9]{40}$/);
});
