import { readFileSync } from 'fs';
import { join } from 'path';

import type { StrapiCommunityNodeType } from '../community-node-types-utils';

function isStrapiCommunityNodeType(item: unknown): item is StrapiCommunityNodeType {
	if (typeof item !== 'object' || item === null) return false;

	const obj = item as Record<string, unknown>;

	// Required fields
	if (typeof obj.authorGithubUrl !== 'string') return false;
	if (typeof obj.authorName !== 'string') return false;
	if (typeof obj.checksum !== 'string') return false;
	if (typeof obj.description !== 'string') return false;
	if (typeof obj.displayName !== 'string') return false;
	if (typeof obj.name !== 'string') return false;
	if (typeof obj.numberOfStars !== 'number') return false;
	if (typeof obj.numberOfDownloads !== 'number') return false;
	if (typeof obj.packageName !== 'string') return false;
	if (typeof obj.createdAt !== 'string') return false;
	if (typeof obj.updatedAt !== 'string') return false;
	if (typeof obj.npmVersion !== 'string') return false;
	if (typeof obj.isOfficialNode !== 'boolean') return false;
	if (typeof obj.nodeDescription !== 'object' || obj.nodeDescription === null) return false;

	// Optional fields
	if (
		obj.companyName !== undefined &&
		obj.companyName !== null &&
		typeof obj.companyName !== 'string'
	) {
		return false;
	}

	if (obj.nodeVersions !== undefined) {
		if (!Array.isArray(obj.nodeVersions)) return false;
		for (const version of obj.nodeVersions) {
			if (typeof version !== 'object' || version === null) return false;
			if (typeof version.npmVersion !== 'string') return false;
			if (typeof version.checksum !== 'string') return false;
		}
	}

	return true;
}

describe('Community node types data files', () => {
	const dataDir = join(__dirname, '..', 'data');

	describe('production-node-types.json', () => {
		it('should contain parseable JSON', () => {
			const filePath = join(dataDir, 'production-node-types.json');
			const fileContent = readFileSync(filePath, 'utf-8');

			expect(() => JSON.parse(fileContent)).not.toThrow();
		});

		it('should contain a non-empty array', () => {
			const filePath = join(dataDir, 'production-node-types.json');
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = JSON.parse(fileContent);

			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
		});

		it('should have all items conform to StrapiCommunityNodeType schema', () => {
			const filePath = join(dataDir, 'production-node-types.json');
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = JSON.parse(fileContent);

			data.forEach((item: unknown) => {
				expect(isStrapiCommunityNodeType(item)).toBe(true);
			});
		});
	});

	describe('staging-node-types.json', () => {
		it('should contain parseable JSON', () => {
			const filePath = join(dataDir, 'staging-node-types.json');
			const fileContent = readFileSync(filePath, 'utf-8');

			expect(() => JSON.parse(fileContent)).not.toThrow();
		});

		it('should contain a non-empty array', () => {
			const filePath = join(dataDir, 'staging-node-types.json');
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = JSON.parse(fileContent);

			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
		});

		it('should have all items conform to StrapiCommunityNodeType schema', () => {
			const filePath = join(dataDir, 'staging-node-types.json');
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = JSON.parse(fileContent);

			data.forEach((item: unknown) => {
				expect(isStrapiCommunityNodeType(item)).toBe(true);
			});
		});
	});
});
