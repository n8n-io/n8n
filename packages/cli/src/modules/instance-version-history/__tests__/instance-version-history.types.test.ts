import {
	compareVersions,
	formatVersion,
	parseVersion,
	versionGte,
} from '../instance-version-history.types';

describe('instance-version-history.types', () => {
	describe('parseVersion', () => {
		it('should parse a valid semver string', () => {
			expect(parseVersion('2.3.4')).toEqual({ major: 2, minor: 3, patch: 4 });
		});

		it('should parse version with pre-release suffix', () => {
			expect(parseVersion('2.3.4-beta.1')).toEqual({ major: 2, minor: 3, patch: 4 });
		});

		it('should throw on invalid version string', () => {
			expect(() => parseVersion('invalid')).toThrow('Invalid version string');
		});
	});

	describe('compareVersions', () => {
		it('should return 0 for equal versions', () => {
			expect(
				compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 }),
			).toBe(0);
		});

		it('should compare major versions', () => {
			expect(
				compareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 9, patch: 9 }),
			).toBe(1);
			expect(
				compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 }),
			).toBe(-1);
		});

		it('should compare minor versions', () => {
			expect(
				compareVersions({ major: 1, minor: 3, patch: 0 }, { major: 1, minor: 2, patch: 9 }),
			).toBe(1);
		});

		it('should compare patch versions', () => {
			expect(
				compareVersions({ major: 1, minor: 2, patch: 4 }, { major: 1, minor: 2, patch: 3 }),
			).toBe(1);
		});
	});

	describe('versionGte', () => {
		it('should return true for equal versions', () => {
			expect(versionGte({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 })).toBe(
				true,
			);
		});

		it('should return true for greater versions', () => {
			expect(versionGte({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 9, patch: 9 })).toBe(
				true,
			);
		});

		it('should return false for lesser versions', () => {
			expect(versionGte({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 4 })).toBe(
				false,
			);
		});
	});

	describe('formatVersion', () => {
		it('should format version as string', () => {
			expect(formatVersion({ major: 2, minor: 3, patch: 4 })).toBe('2.3.4');
		});
	});
});
