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
const script = manifestStep.run
	.replaceAll('${{ secrets.DOCKER_USERNAME }}', 'n8nio')
	.replaceAll('${{ github.repository_owner }}', 'n8n-io')
	.replaceAll('${{ matrix.image.repo }}', 'node-patched')
	.replaceAll('${{ github.sha }}', 'commit');
const repositories = ['n8nio/node-patched', 'ghcr.io/n8n-io/node-patched'];

function publish(missingImage = '') {
	return spawnSync(
		'bash',
		[
			'-e',
			'-o',
			'pipefail',
			'-c',
			`
docker() {
  if [ "$3" = inspect ]; then
    [ "$4" != "$MISSING_IMAGE" ]
  elif [ "$3" = create ]; then
    for image in "\${@:6}"; do
      if [ "$image" = "$MISSING_IMAGE" ]; then return 1; fi
    done
    echo "create $5"
  else
    return 1
  fi
}
${script}`,
		],
		{
			encoding: 'utf8',
			env: { ...process.env, NODE_VERSION: '26.13.0', MISSING_IMAGE: missingImage },
		},
	);
}

describe('Node source image manifests', () => {
	for (const repository of repositories) {
		for (const stage of ['', '-dev']) {
			for (const arch of ['amd64', 'arm64']) {
				const missingImage = `${repository}:26.13.0-commit${stage}-${arch}`;
				it(`keeps all tags unchanged when ${missingImage} is missing`, () => {
					const result = publish(missingImage);
					assert.notEqual(result.status, 0, result.stderr);
					assert.doesNotMatch(result.stdout, /^create /m);
				});
			}
		}
	}

	it('publishes runtime and dev tags in both registries when all images exist', () => {
		const result = publish();
		assert.equal(result.status, 0, result.stderr);
		const createdTags = result.stdout
			.split('\n')
			.filter((line) => line.startsWith('create '))
			.map((line) => line.slice('create '.length));
		const expectedTags = repositories.flatMap((repository) =>
			['', '-dev'].flatMap((stage) => [
				`${repository}:26.13.0${stage}`,
				`${repository}:26.13.0-commit${stage}`,
			]),
		);
		assert.deepEqual(createdTags.sort(), expectedTags.sort());
	});
});
