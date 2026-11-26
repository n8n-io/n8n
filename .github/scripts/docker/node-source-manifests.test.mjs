import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse } from 'yaml';

const workflow = parse(
	readFileSync(new URL('../../workflows/build-node-pc-image.yml', import.meta.url), 'utf8'),
);
const manifestStep = workflow.jobs['create-multi-arch-manifest'].steps.find(
	(step) => step.name === 'Create multi-arch manifests',
);
const repositories = ['n8nio/node-patched', 'ghcr.io/n8n-io/node-patched'];

function render(template, values) {
	return template.replace(/\$\{\{ (.+?) \}\}/g, (_, key) => {
		assert.ok(Object.hasOwn(values, key), `Unknown workflow expression: ${key}`);
		return values[key];
	});
}

function context(overrides = {}) {
	const values = {
		'secrets.DOCKER_USERNAME': 'n8nio',
		'github.repository_owner': 'n8n-io',
		'matrix.image.repo': 'node-patched',
		'env.REPO': 'node-patched',
		'env.NODE_VERSION': '26.13.0',
		'github.sha': 'commit',
		'github.run_id': '100',
		'github.run_attempt': '2',
		...overrides,
	};
	values['env.STAGING_TAG'] = render(workflow.env?.STAGING_TAG ?? '', values);
	return values;
}

function buildImages(values) {
	return workflow.jobs.build.steps
		.filter((step) => step.with?.tags)
		.flatMap((step) =>
			['amd64', 'arm64'].flatMap((arch) =>
				render(step.with.tags, { ...values, 'matrix.platform.arch': arch })
					.trim()
					.split('\n')
					.map((tag) => ({ tag, arch, stage: step.with.target })),
			),
		);
}

function publish({ missingImage = '', previousExecution, failedBuild } = {}) {
	const values = context();
	const images = new Map();
	if (previousExecution) {
		for (const { tag } of buildImages(context(previousExecution))) images.set(tag, 'previous');
	}
	for (const { tag, arch, stage } of buildImages(values)) {
		if (failedBuild?.arch === arch && failedBuild.stage === stage) continue;
		images.set(tag, 'current');
	}
	images.delete(missingImage);

	return spawnSync(
		'bash',
		[
			'-e',
			'-o',
			'pipefail',
			'-c',
			`
generation() {
  while read -r tag generation; do
    if [ "$tag" = "$1" ]; then echo "$generation"; return 0; fi
  done <<< "$IMAGES"
  return 1
}
docker() {
  if [ "$3" = inspect ]; then
    generation "$4"
  elif [ "$3" = create ]; then
    for image in "\${@:6}"; do
      source_generation=$(generation "$image") || return 1
      echo "source $image $source_generation"
    done
    echo "create $5"
  else
    return 1
  fi
}
${render(manifestStep.run, values)}`,
		],
		{
			encoding: 'utf8',
			env: {
				...process.env,
				NODE_VERSION: values['env.NODE_VERSION'],
				STAGING_TAG: values['env.STAGING_TAG'],
				IMAGES: [...images].map(([tag, generation]) => `${tag} ${generation}`).join('\n'),
			},
		},
	);
}

describe('Node source image manifests', () => {
	for (const repository of repositories) {
		for (const arch of ['amd64', 'arm64']) {
			const missingImage = `${repository}:26.13.0-commit-100-2-dev-${arch}`;
			it(`keeps all tags unchanged when ${missingImage} is missing`, () => {
				const result = publish({ missingImage });
				assert.notEqual(result.status, 0, result.stderr);
				assert.doesNotMatch(result.stdout, /^create /m);
			});
		}
	}

	for (const [name, previousExecution] of [
		['run', { 'github.run_id': '99' }],
		['attempt', { 'github.run_attempt': '1' }],
	]) {
		for (const arch of ['amd64', 'arm64']) {
			it(`keeps all tags unchanged after a failed dev ${arch} rebuild with prior ${name} images`, () => {
				const result = publish({ previousExecution, failedBuild: { stage: 'dev', arch } });
				assert.notEqual(result.status, 0, result.stderr);
				assert.doesNotMatch(result.stdout, /^create /m);
			});
		}
	}

	it('publishes dev tags in both registries when all images exist', () => {
		const result = publish({ previousExecution: { 'github.run_attempt': '1' } });
		assert.equal(result.status, 0, result.stderr);
		const sources = result.stdout.split('\n').filter((line) => line.startsWith('source '));
		assert.equal(sources.length, 8);
		for (const source of sources) assert.match(source, / current$/);
		const createdTags = result.stdout
			.split('\n')
			.filter((line) => line.startsWith('create '))
			.map((line) => line.slice('create '.length));
		const expectedTags = repositories.flatMap((repository) => [
			`${repository}:26.13.0-dev`,
			`${repository}:26.13.0-commit-dev`,
		]);
		assert.deepEqual(createdTags.sort(), expectedTags.sort());
	});
});
