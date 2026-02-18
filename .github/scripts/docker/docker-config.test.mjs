import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import BuildContext from './docker-config.mjs';

describe('BuildContext', () => {
	let ctx;

	beforeEach(() => {
		delete process.env.GITHUB_OUTPUT;
		ctx = new BuildContext();
	});

	describe('determine()', () => {
		it('should use version and releaseType when both are provided', () => {
			const result = ctx.determine({ version: '1.2.3', releaseType: 'stable' });
			assert.equal(result.version, '1.2.3');
			assert.equal(result.release_type, 'stable');
			assert.equal(result.push_to_docker, true);
		});

		it('should configure nightly for schedule events', () => {
			const result = ctx.determine({ event: 'schedule' });
			assert.equal(result.version, 'nightly');
			assert.equal(result.release_type, 'nightly');
			assert.equal(result.push_to_docker, true);
			assert.deepEqual(result.platforms, ['linux/amd64', 'linux/arm64']);
		});

		it('should configure PR builds as single-platform dev', () => {
			const result = ctx.determine({ event: 'pull_request', pr: '42' });
			assert.equal(result.version, 'pr-42');
			assert.equal(result.release_type, 'dev');
			assert.deepEqual(result.platforms, ['linux/amd64']);
		});

		it('should configure workflow_dispatch as single-platform branch', () => {
			const result = ctx.determine({ event: 'workflow_dispatch', branch: 'feat/my-branch' });
			assert.equal(result.version, 'branch-feat-my-branch');
			assert.equal(result.release_type, 'branch');
			assert.deepEqual(result.platforms, ['linux/amd64']);
		});

		it('should configure push to master as dev', () => {
			const result = ctx.determine({ event: 'push', branch: 'master' });
			assert.equal(result.version, 'dev');
			assert.equal(result.release_type, 'dev');
			assert.equal(result.push_to_docker, true);
		});

		it('should configure push to non-master branch', () => {
			const result = ctx.determine({ event: 'push', branch: 'feature/test' });
			assert.equal(result.version, 'branch-feature-test');
			assert.equal(result.release_type, 'branch');
			assert.deepEqual(result.platforms, ['linux/amd64']);
		});

		it('should configure workflow_call with version', () => {
			const result = ctx.determine({ event: 'workflow_call', version: '2.0.0' });
			assert.equal(result.version, '2.0.0');
			assert.equal(result.release_type, 'stable');
			assert.equal(result.push_to_docker, true);
		});

		it('should throw for workflow_call without version', () => {
			assert.throws(
				() => ctx.determine({ event: 'workflow_call' }),
				(err) => {
					assert.match(err.message, /Version required/);
					return true;
				},
			);
		});

		it('should throw for unknown events', () => {
			assert.throws(
				() => ctx.determine({ event: 'unknown_event' }),
				(err) => {
					assert.match(err.message, /Unknown event/);
					return true;
				},
			);
		});

		it('should respect pushEnabled override', () => {
			const result = ctx.determine({ event: 'schedule', pushEnabled: false });
			assert.equal(result.push_enabled, false);
		});

		it('should default push_enabled to push_to_ghcr', () => {
			const result = ctx.determine({ event: 'schedule' });
			assert.equal(result.push_enabled, result.push_to_ghcr);
		});
	});

	describe('sanitizeBranch()', () => {
		it('should lowercase and replace special characters', () => {
			assert.equal(ctx.sanitizeBranch('Feature/MY-Branch'), 'feature-my-branch');
		});

		it('should remove leading dots and dashes', () => {
			assert.equal(ctx.sanitizeBranch('.hidden-branch'), 'hidden-branch');
			assert.equal(ctx.sanitizeBranch('-bad-start'), 'bad-start');
		});

		it('should remove trailing dots and dashes', () => {
			assert.equal(ctx.sanitizeBranch('branch-name.'), 'branch-name');
			assert.equal(ctx.sanitizeBranch('branch-name-'), 'branch-name');
		});

		it('should truncate to 128 characters', () => {
			const longBranch = 'a'.repeat(200);
			assert.equal(ctx.sanitizeBranch(longBranch).length, 128);
		});

		it('should return unknown for falsy input', () => {
			assert.equal(ctx.sanitizeBranch(''), 'unknown');
			assert.equal(ctx.sanitizeBranch(null), 'unknown');
			assert.equal(ctx.sanitizeBranch(undefined), 'unknown');
		});
	});

	describe('buildMatrix()', () => {
		it('should build matrix for dual-platform', () => {
			const matrix = ctx.buildMatrix(['linux/amd64', 'linux/arm64']);
			assert.deepEqual(matrix.platform, ['amd64', 'arm64']);
			assert.equal(matrix.include.length, 2);
			assert.equal(matrix.include[0].runner, 'blacksmith-4vcpu-ubuntu-2204');
			assert.equal(matrix.include[1].runner, 'blacksmith-4vcpu-ubuntu-2204-arm');
		});

		it('should build matrix for single-platform', () => {
			const matrix = ctx.buildMatrix(['linux/amd64']);
			assert.deepEqual(matrix.platform, ['amd64']);
			assert.equal(matrix.include.length, 1);
			assert.equal(matrix.include[0].docker_platform, 'linux/amd64');
		});
	});
});
