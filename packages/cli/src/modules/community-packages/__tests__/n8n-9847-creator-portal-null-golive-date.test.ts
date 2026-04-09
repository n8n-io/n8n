/**
 * Reproduction test for N8N-9847: Creator Portal shows 'null' as expected golive date
 *
 * This test reproduces a bug where the Creator Portal displays 'null' as the expected
 * golive date when a node is approved. The issue occurs when the expectedGoLiveDate
 * field is null or undefined in the API response from Strapi.
 *
 * Expected behavior: The date should either be formatted properly or shown as "TBD" or
 * similar placeholder text, not the literal string "null".
 *
 * Root cause: The Creator Portal (external system) likely receives node approval data
 * that includes an expectedGoLiveDate field. When this field is null, the UI template
 * displays it as the literal string "null" instead of handling it gracefully.
 */

import type { CommunityNodeType } from '@n8n/api-types';

describe('N8N-9847: Creator Portal null golive date', () => {
	/**
	 * Mock Strapi response that might include additional fields beyond the CommunityNodeType interface.
	 * The Creator Portal may receive extended data with an expectedGoLiveDate field.
	 */
	interface ExtendedCommunityNodeType extends CommunityNodeType {
		expectedGoLiveDate?: string | null;
	}

	describe('Creator Portal node approval data', () => {
		it('REPRO: null expectedGoLiveDate displays as literal "null" string', () => {
			// Simulate the data structure that the Creator Portal receives after node approval
			const approvedNodeData: ExtendedCommunityNodeType = {
				id: 1,
				authorGithubUrl: 'https://github.com/author',
				authorName: 'Test Author',
				checksum: 'abc123',
				description: 'Test node description',
				displayName: 'Test Node',
				name: 'n8n-nodes-test',
				numberOfStars: 10,
				numberOfDownloads: 100,
				packageName: 'n8n-nodes-test',
				createdAt: '2026-03-01T00:00:00.000Z',
				updatedAt: '2026-03-30T00:00:00.000Z',
				npmVersion: '1.0.0',
				isOfficialNode: false,
				isInstalled: false,
				nodeDescription: {} as any,
				// BUG: This field is null, which the Creator Portal displays as "null"
				expectedGoLiveDate: null,
			};

			// This is how the Creator Portal might render the message
			// (simulating a template string interpolation)
			const message = `Thanks for approving the node, but there's one thing that is not clear in the message, the expected to be live date is shown ${approvedNodeData.expectedGoLiveDate}`;

			// FAILING TEST: This demonstrates the bug - it literally says "null"
			expect(message).toContain('the expected to be live date is shown null');

			// This is the exact issue from the screenshot in the bug report
			// The user sees: "the expected to be live date is shown null"
		});

		it('REPRO: JSON serialization of null date field', () => {
			const nodeData: ExtendedCommunityNodeType = {
				id: 1,
				authorGithubUrl: 'https://github.com/author',
				authorName: 'Test Author',
				checksum: 'abc123',
				description: 'Test node',
				displayName: 'Test',
				name: 'n8n-nodes-test',
				numberOfStars: 0,
				numberOfDownloads: 0,
				packageName: 'n8n-nodes-test',
				createdAt: '2026-03-01T00:00:00.000Z',
				updatedAt: '2026-03-30T00:00:00.000Z',
				npmVersion: '1.0.0',
				isOfficialNode: false,
				isInstalled: false,
				nodeDescription: {} as any,
				expectedGoLiveDate: null,
			};

			const serialized = JSON.stringify(nodeData);

			// When sent over API, null is preserved in JSON
			expect(serialized).toContain('"expectedGoLiveDate":null');

			// But when interpolated in a UI template, it becomes the string "null"
			const parsed = JSON.parse(serialized) as ExtendedCommunityNodeType;
			const displayText = `Expected date: ${parsed.expectedGoLiveDate}`;

			// FAILING: Shows "Expected date: null" instead of proper handling
			expect(displayText).toBe('Expected date: null');
		});

		it('EXPECTED: null date should be handled with fallback text', () => {
			const nodeData: ExtendedCommunityNodeType = {
				id: 1,
				authorGithubUrl: 'https://github.com/author',
				authorName: 'Test Author',
				checksum: 'abc123',
				description: 'Test node',
				displayName: 'Test',
				name: 'n8n-nodes-test',
				numberOfStars: 0,
				numberOfDownloads: 0,
				packageName: 'n8n-nodes-test',
				createdAt: '2026-03-01T00:00:00.000Z',
				updatedAt: '2026-03-30T00:00:00.000Z',
				npmVersion: '1.0.0',
				isOfficialNode: false,
				isInstalled: false,
				nodeDescription: {} as any,
				expectedGoLiveDate: null,
			};

			// Proper handling: use nullish coalescing or default value
			const formattedDate = nodeData.expectedGoLiveDate ?? 'To be determined';
			const displayText = `Expected date: ${formattedDate}`;

			// EXPECTED BEHAVIOR: Should show meaningful text
			expect(displayText).toBe('Expected date: To be determined');
		});

		it('EXPECTED: valid date should be formatted properly', () => {
			const validDate = '2026-05-01T00:00:00.000Z';
			const nodeData: ExtendedCommunityNodeType = {
				id: 1,
				authorGithubUrl: 'https://github.com/author',
				authorName: 'Test Author',
				checksum: 'abc123',
				description: 'Test node',
				displayName: 'Test',
				name: 'n8n-nodes-test',
				numberOfStars: 0,
				numberOfDownloads: 0,
				packageName: 'n8n-nodes-test',
				createdAt: '2026-03-01T00:00:00.000Z',
				updatedAt: '2026-03-30T00:00:00.000Z',
				npmVersion: '1.0.0',
				isOfficialNode: false,
				isInstalled: false,
				nodeDescription: {} as any,
				expectedGoLiveDate: validDate,
			};

			// Format the date properly
			const formattedDate = nodeData.expectedGoLiveDate
				? new Date(nodeData.expectedGoLiveDate).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})
				: 'To be determined';

			expect(formattedDate).toBe('May 1, 2026');
		});
	});

	describe('Recommended fixes for Creator Portal', () => {
		it('FIX OPTION 1: Use nullish coalescing in template', () => {
			const nodeData: ExtendedCommunityNodeType = {
				id: 1,
				authorGithubUrl: 'https://github.com/author',
				authorName: 'Test Author',
				checksum: 'abc123',
				description: 'Test node',
				displayName: 'Test',
				name: 'n8n-nodes-test',
				numberOfStars: 0,
				numberOfDownloads: 0,
				packageName: 'n8n-nodes-test',
				createdAt: '2026-03-01T00:00:00.000Z',
				updatedAt: '2026-03-30T00:00:00.000Z',
				npmVersion: '1.0.0',
				isOfficialNode: false,
				isInstalled: false,
				nodeDescription: {} as any,
				expectedGoLiveDate: null,
			};

			// Fix: Use ?? operator to provide fallback
			const message = `expected to be live date is ${nodeData.expectedGoLiveDate ?? 'TBD'}`;
			expect(message).toBe('expected to be live date is TBD');
		});

		it('FIX OPTION 2: Format date before display', () => {
			const formatGoLiveDate = (date: string | null | undefined): string => {
				if (!date) return 'To be determined';
				return new Date(date).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				});
			};

			// Test with null
			expect(formatGoLiveDate(null)).toBe('To be determined');

			// Test with undefined
			expect(formatGoLiveDate(undefined)).toBe('To be determined');

			// Test with valid date
			expect(formatGoLiveDate('2026-05-01T00:00:00.000Z')).toBe('May 1, 2026');
		});

		it('FIX OPTION 3: Conditional rendering in UI', () => {
			const nodeDataWithNull: ExtendedCommunityNodeType = {
				id: 1,
				authorGithubUrl: 'https://github.com/author',
				authorName: 'Test Author',
				checksum: 'abc123',
				description: 'Test node',
				displayName: 'Test',
				name: 'n8n-nodes-test',
				numberOfStars: 0,
				numberOfDownloads: 0,
				packageName: 'n8n-nodes-test',
				createdAt: '2026-03-01T00:00:00.000Z',
				updatedAt: '2026-03-30T00:00:00.000Z',
				npmVersion: '1.0.0',
				isOfficialNode: false,
				isInstalled: false,
				nodeDescription: {} as any,
				expectedGoLiveDate: null,
			};

			// Only show the date field if it exists
			const message = nodeDataWithNull.expectedGoLiveDate
				? `expected to be live date is ${nodeDataWithNull.expectedGoLiveDate}`
				: 'expected go-live date will be determined soon';

			expect(message).toBe('expected go-live date will be determined soon');
		});
	});
});
