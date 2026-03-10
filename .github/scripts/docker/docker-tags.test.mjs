import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import TagGenerator from './docker-tags.mjs';

describe('TagGenerator', () => {
	let gen;

	beforeEach(() => {
		delete process.env.GITHUB_OUTPUT;
		delete process.env.GITHUB_REPOSITORY_OWNER;
		delete process.env.DOCKER_USERNAME;
		gen = new TagGenerator();
	});

	describe('generate()', () => {
		it('should generate GHCR tag for n8n image', () => {
			const tags = gen.generate({ image: 'n8n', version: '1.0.0' });
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/n8n:1.0.0']);
			assert.deepEqual(tags.docker, []);
			assert.deepEqual(tags.all, ['ghcr.io/n8n-io/n8n:1.0.0']);
		});

		it('should generate GHCR tag with platform suffix', () => {
			const tags = gen.generate({ image: 'n8n', version: '1.0.0', platform: 'linux/amd64' });
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/n8n:1.0.0-amd64']);
		});

		it('should generate both GHCR and Docker Hub tags when includeDockerHub is true', () => {
			const tags = gen.generate({ image: 'n8n', version: '1.0.0', includeDockerHub: true });
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/n8n:1.0.0']);
			assert.deepEqual(tags.docker, ['n8nio/n8n:1.0.0']);
			assert.equal(tags.all.length, 2);
		});

		it('should handle runners-distroless by using runners image name with suffix', () => {
			const tags = gen.generate({ image: 'runners-distroless', version: '1.0.0' });
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/runners:1.0.0-distroless']);
		});

		it('should handle runners image without distroless suffix', () => {
			const tags = gen.generate({ image: 'runners', version: '1.0.0' });
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/runners:1.0.0']);
		});

		it('should combine platform and distroless suffixes', () => {
			const tags = gen.generate({
				image: 'runners-distroless',
				version: '2.0.0',
				platform: 'linux/arm64',
			});
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/runners:2.0.0-distroless-arm64']);
		});

		it('should handle nightly version', () => {
			const tags = gen.generate({ image: 'n8n', version: 'nightly' });
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/n8n:nightly']);
		});

		it('should handle dev version', () => {
			const tags = gen.generate({ image: 'n8n', version: 'dev', platform: 'linux/amd64' });
			assert.deepEqual(tags.ghcr, ['ghcr.io/n8n-io/n8n:dev-amd64']);
		});
	});

	describe('generateAll()', () => {
		it('should generate tags for all three image types', () => {
			const results = gen.generateAll({ version: '1.0.0' });
			assert.ok('n8n' in results);
			assert.ok('runners' in results);
			assert.ok('runners_distroless' in results);
		});

		it('should generate correct tags for each image', () => {
			const results = gen.generateAll({ version: '1.0.0', platform: 'linux/amd64' });
			assert.deepEqual(results.n8n.ghcr, ['ghcr.io/n8n-io/n8n:1.0.0-amd64']);
			assert.deepEqual(results.runners.ghcr, ['ghcr.io/n8n-io/runners:1.0.0-amd64']);
			assert.deepEqual(results.runners_distroless.ghcr, [
				'ghcr.io/n8n-io/runners:1.0.0-distroless-amd64',
			]);
		});

		it('should include Docker Hub tags when requested', () => {
			const results = gen.generateAll({
				version: '1.0.0',
				includeDockerHub: true,
			});
			assert.equal(results.n8n.docker.length, 1);
			assert.equal(results.runners.docker.length, 1);
			assert.equal(results.runners_distroless.docker.length, 1);
		});
	});

	describe('defaults', () => {
		it('should use n8n-io as default github owner', () => {
			assert.equal(gen.githubOwner, 'n8n-io');
		});

		it('should use n8nio as default docker username', () => {
			assert.equal(gen.dockerUsername, 'n8nio');
		});

		it('should respect GITHUB_REPOSITORY_OWNER env var', () => {
			process.env.GITHUB_REPOSITORY_OWNER = 'custom-org';
			const customGen = new TagGenerator();
			assert.equal(customGen.githubOwner, 'custom-org');
			delete process.env.GITHUB_REPOSITORY_OWNER;
		});
	});
});
