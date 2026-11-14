// 新增单测：packages/cli/src/modules/source-control.ee/__tests__/source-control-get-status.test.ts
// 本包 vitest globals 已启用（参照同目录 source-control-status.service.test.ts）

import { SourceControlGetStatus } from '../types/source-control-get-status';

describe('SourceControlGetStatus', () => {
	describe('preferLocalVersion', () => {
		it('defaults to true when the query parameter is missing', () => {
			const status = new SourceControlGetStatus({
				direction: 'pull',
				preferLocalVersion: undefined,
				verbose: undefined,
			});

			expect(status.preferLocalVersion).toBe(true);
		});

		it('honors an explicit false', () => {
			const status = new SourceControlGetStatus({
				direction: 'pull',
				preferLocalVersion: false,
				verbose: undefined,
			});

			expect(status.preferLocalVersion).toBe(false);
		});

		it('honors the query string "false"', () => {
			const status = new SourceControlGetStatus({
				direction: 'pull',
				preferLocalVersion: 'false',
				verbose: undefined,
			});

			expect(status.preferLocalVersion).toBe(false);
		});

		it('honors the query string "true"', () => {
			const status = new SourceControlGetStatus({
				direction: 'pull',
				preferLocalVersion: 'true',
				verbose: undefined,
			});

			expect(status.preferLocalVersion).toBe(true);
		});

		it('honors an explicit true', () => {
			const status = new SourceControlGetStatus({
				direction: 'pull',
				preferLocalVersion: true,
				verbose: undefined,
			});

			expect(status.preferLocalVersion).toBe(true);
		});
	});

	describe('verbose', () => {
		it('defaults to false when the query parameter is missing', () => {
			const status = new SourceControlGetStatus({
				direction: 'push',
				preferLocalVersion: undefined,
				verbose: undefined,
			});

			expect(status.verbose).toBe(false);
		});

		it('honors the query string "true"', () => {
			const status = new SourceControlGetStatus({
				direction: 'push',
				preferLocalVersion: undefined,
				verbose: 'true',
			});

			expect(status.verbose).toBe(true);
		});
	});
});
