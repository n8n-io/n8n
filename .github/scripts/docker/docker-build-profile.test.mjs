import assert from 'node:assert/strict';
import { test } from 'node:test';

import BuildContext from './docker-config.mjs';
import TagGenerator from './docker-tags.mjs';

const context = new BuildContext();
const tags = new TagGenerator();

test('manual builds keep the existing default platform and targets', () => {
	const result = context.determine({ event: 'workflow_dispatch', branch: 'test' });
	assert.deepEqual(result.platforms, ['linux/amd64']);
	assert.deepEqual(result.targets, ['n8n', 'runners', 'runners-distroless', 'n8n-pc']);
	assert.equal(result.push_to_docker, false);
});

test('include_arm64 still selects both platforms', () => {
	const result = context.determine({ event: 'workflow_dispatch', includeArm64: true });
	assert.deepEqual(result.platforms, ['linux/amd64', 'linux/arm64']);
});

test('ARM cloud-test builds select only the deployment images and their tags', () => {
	const result = context.determine({
		event: 'workflow_dispatch',
		branch: 'test',
		architecture: 'arm64',
		buildProfile: 'cloud-test',
	});
	assert.deepEqual(result.platforms, ['linux/arm64']);
	assert.deepEqual(context.buildMatrix(result.platforms).include, [
		{
			platform: 'arm64',
			runner: 'blacksmith-8vcpu-ubuntu-2204-arm',
			docker_platform: 'linux/arm64',
		},
	]);
	const generated = tags.generateAll({
		version: result.version,
		platform: result.platforms[0],
		sha: 'abcdef0',
		images: result.targets,
	});
	assert.deepEqual(Object.keys(generated), ['n8n', 'runners_distroless']);
	assert.equal(
		generated.runners_distroless.shaPrimaryTag,
		'ghcr.io/n8n-io/runners:branch-test-abcdef0-distroless',
	);
	assert.ok(generated.n8n.ghcr.every((tag) => tag.endsWith('-arm64')));
	assert.deepEqual(generated.n8n.docker, []);
});

test('release and nightly builds keep both architectures and all targets', () => {
	for (const input of [
		{ event: 'workflow_call', version: '2.42.0', releaseType: 'stable' },
		{ event: 'schedule' },
	]) {
		const result = context.determine(input);
		assert.deepEqual(result.platforms, ['linux/amd64', 'linux/arm64']);
		assert.equal(result.targets.length, 4);
		assert.equal(result.push_to_docker, true);
	}
});

test('build-only runs do not select the PC image', () => {
	const result = context.determine({ event: 'workflow_dispatch', pushEnabled: false });
	assert.deepEqual(result.targets, ['n8n', 'runners', 'runners-distroless']);
});

test('profile and architecture overrides cannot narrow a release or nightly build', () => {
	assert.throws(() => context.determine({ event: 'schedule', architecture: 'arm64' }));
	assert.throws(() => context.determine({ event: 'workflow_call', buildProfile: 'cloud-test' }));
	assert.throws(() =>
		context.determine({
			event: 'workflow_dispatch',
			version: '2.42.0',
			releaseType: 'stable',
			buildProfile: 'cloud-test',
		}),
	);
});

test('unknown profiles, architectures, and image targets fail before building', () => {
	assert.throws(() => context.determine({ event: 'workflow_dispatch', architecture: 'typo' }));
	assert.throws(() => context.determine({ event: 'workflow_dispatch', buildProfile: 'typo' }));
	assert.throws(() => tags.generateAll({ version: 'test', images: ['typo'] }));
	assert.throws(() => tags.generateAll({ version: 'test', images: [] }));
});
