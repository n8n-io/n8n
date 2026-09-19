import type { NodeSearchResult } from '@n8n/ai-utilities/node-catalog';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { filterSearchResultsWithJev, type JevDecisionClient } from '../filter-search-results';

function createMockNode(
	name: string,
	displayName: string,
	description: string,
	isTrigger = false,
): NodeSearchResult {
	return {
		name,
		displayName,
		description,
		version: 1,
		inputs: isTrigger ? [] : ['main'],
		outputs: ['main'],
		score: 100,
	};
}

describe('filterSearchResultsWithJev', () => {
	const originalApiKey = process.env.TYPESAFE_API_KEY;

	beforeEach(() => {
		delete process.env.TYPESAFE_API_KEY;
	});

	afterEach(() => {
		if (originalApiKey !== undefined) {
			process.env.TYPESAFE_API_KEY = originalApiKey;
		} else {
			delete process.env.TYPESAFE_API_KEY;
		}
	});

	it('returns candidates unchanged when candidates count is <= 3', async () => {
		const mockClient: JevDecisionClient = {
			systemOne: vi.fn(),
		};

		const candidates: NodeSearchResult[] = [
			createMockNode(
				'n8n-nodes-base.googleSheets',
				'Google Sheets',
				'Read and write Google Sheets',
			),
			createMockNode(
				'n8n-nodes-base.googleSheetsTrigger',
				'Google Sheets Trigger',
				'Trigger on changes in sheets',
				true,
			),
		];

		const result = await filterSearchResultsWithJev('Google Sheets', candidates, {
			client: mockClient,
		});
		expect(result).toEqual(candidates);
		expect(mockClient.systemOne).not.toHaveBeenCalled();
	});

	it('returns candidates as they are right now when Jev is not present (no API key / client)', async () => {
		const candidates: NodeSearchResult[] = [
			createMockNode('n8n-nodes-base.googleAds', 'Google Ads', 'Use the Google Ads API'),
			createMockNode('n8n-nodes-base.googleChat', 'Google Chat', 'Consume Google Chat API'),
			createMockNode('n8n-nodes-base.googleDocs', 'Google Docs', 'Consume Google Docs API'),
			createMockNode('n8n-nodes-base.googleBooks', 'Google Books', 'Read data from Google Books'),
			createMockNode('n8n-nodes-base.googleDrive', 'Google Drive', 'Access data on Google Drive'),
			createMockNode(
				'n8n-nodes-base.googleSheets',
				'Google Sheets',
				'Read and write data to Google Sheets',
			),
		];

		const result = await filterSearchResultsWithJev('Google Sheets', candidates);
		// If Jev is not present, return everything as it is right now
		expect(result).toHaveLength(6);
		expect(result).toEqual(candidates);
	});

	it('uses Jev to filter down to top 3 when Jev client is present', async () => {
		const candidates: NodeSearchResult[] = [
			createMockNode('n8n-nodes-base.googleAds', 'Google Ads', 'Use the Google Ads API'),
			createMockNode('n8n-nodes-base.googleChat', 'Google Chat', 'Consume Google Chat API'),
			createMockNode('n8n-nodes-base.googleDocs', 'Google Docs', 'Consume Google Docs API'),
			createMockNode('n8n-nodes-base.googleBooks', 'Google Books', 'Read data from Google Books'),
			createMockNode('n8n-nodes-base.googleDrive', 'Google Drive', 'Access data on Google Drive'),
			createMockNode(
				'n8n-nodes-base.googleSheets',
				'Google Sheets',
				'Read and write data to Google Sheets',
			),
			createMockNode(
				'n8n-nodes-base.googleSheetsTrigger',
				'Google Sheets Trigger',
				'Trigger on changes in sheets',
				true,
			),
			createMockNode(
				'n8n-nodes-base.googleSheetsTool',
				'Google Sheets Tool',
				'Google Sheets tool for agents',
			),
		];

		const mockClient: JevDecisionClient = {
			systemOne: vi.fn().mockResolvedValue({
				model: 'jev-test',
				usage: { input_tokens: 100, output_tokens: 10 },
				answers: {
					node_0: { type: 'noul', noul: 0.05 }, // googleAds
					node_1: { type: 'noul', noul: 0.1 }, // googleChat
					node_2: { type: 'noul', noul: 0.1 }, // googleDocs
					node_3: { type: 'noul', noul: 0.02 }, // googleBooks
					node_4: { type: 'noul', noul: 0.2 }, // googleDrive
					node_5: { type: 'noul', noul: 0.98 }, // googleSheets
					node_6: { type: 'noul', noul: 0.95 }, // googleSheetsTrigger
					node_7: { type: 'noul', noul: 0.85 }, // googleSheetsTool
				},
			}),
		};

		const result = await filterSearchResultsWithJev('Google Sheets', candidates, {
			client: mockClient,
		});

		expect(mockClient.systemOne).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(3);
		expect(result.map((n) => n.name)).toEqual([
			'n8n-nodes-base.googleSheets',
			'n8n-nodes-base.googleSheetsTrigger',
			'n8n-nodes-base.googleSheetsTool',
		]);
	});

	it('gracefully returns all candidates as they are when Jev throws an error', async () => {
		const candidates: NodeSearchResult[] = [
			createMockNode('n8n-nodes-base.googleAds', 'Google Ads', 'Use the Google Ads API'),
			createMockNode('n8n-nodes-base.googleChat', 'Google Chat', 'Consume Google Chat API'),
			createMockNode('n8n-nodes-base.googleDocs', 'Google Docs', 'Consume Google Docs API'),
			createMockNode(
				'n8n-nodes-base.googleSheets',
				'Google Sheets',
				'Read and write data to Google Sheets',
			),
		];

		const mockClient: JevDecisionClient = {
			systemOne: vi.fn().mockRejectedValue(new Error('Network timeout')),
		};

		const result = await filterSearchResultsWithJev('Google Sheets', candidates, {
			client: mockClient,
		});
		expect(result).toEqual(candidates);
	});
});
