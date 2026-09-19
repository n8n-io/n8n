import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { JevDecisionClient } from '../../../utils/jev-client';
import { filterCredentialsWithJev, type CredentialCandidate } from '../filter-credentials';

function createMockCredential(id: string, name: string, type: string): CredentialCandidate {
	return { id, name, type };
}

describe('filterCredentialsWithJev', () => {
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

	it('returns candidates unchanged when query is empty or candidates count is <= 1', async () => {
		const mockClient: JevDecisionClient = {
			systemOne: vi.fn(),
		};

		const candidates: CredentialCandidate[] = [createMockCredential('1', 'Team Slack', 'slackApi')];

		const res1 = await filterCredentialsWithJev('slack', candidates, { client: mockClient });
		expect(res1).toEqual(candidates);

		const multiple = [
			createMockCredential('1', 'Team Slack', 'slackApi'),
			createMockCredential('2', 'Notion account', 'notionApi'),
		];
		const res2 = await filterCredentialsWithJev('', multiple, { client: mockClient });
		expect(res2).toEqual(multiple);

		expect(mockClient.systemOne).not.toHaveBeenCalled();
	});

	it('returns candidates as they are right now when Jev is not present (no API key / client)', async () => {
		const candidates: CredentialCandidate[] = [
			createMockCredential('1', 'Team Slack', 'slackApi'),
			createMockCredential('2', 'Marketing Slack', 'slackApi'),
			createMockCredential('3', 'Gmail account', 'gmailOAuth2'),
			createMockCredential('4', 'Linear API Key', 'linearApi'),
			createMockCredential('5', 'GitHub Token', 'githubApi'),
		];

		const result = await filterCredentialsWithJev('Slack and WhatsApp', candidates);
		// If Jev is not present, return everything as it is right now
		expect(result).toHaveLength(5);
		expect(result).toEqual(candidates);
	});

	it('uses Jev to filter down to relevant credentials when Jev client is present', async () => {
		const candidates: CredentialCandidate[] = [
			createMockCredential('1', 'Team Slack', 'slackApi'),
			createMockCredential('2', 'Marketing Slack', 'slackApi'),
			createMockCredential('3', 'Gmail account', 'gmailOAuth2'),
			createMockCredential('4', 'Linear API Key', 'linearApi'),
			createMockCredential('5', 'GitHub Token', 'githubApi'),
			createMockCredential('6', 'Notion account', 'notionApi'),
		];

		const mockClient: JevDecisionClient = {
			systemOne: vi.fn().mockResolvedValue({
				model: 'jev-test',
				usage: { input_tokens: 120, output_tokens: 15 },
				answers: {
					cred_0: { type: 'noul', noul: 0.96 }, // Team Slack
					cred_1: { type: 'noul', noul: 0.65 }, // Marketing Slack
					cred_2: { type: 'noul', noul: 0.05 }, // Gmail
					cred_3: { type: 'noul', noul: 0.02 }, // Linear
					cred_4: { type: 'noul', noul: 0.01 }, // GitHub
					cred_5: { type: 'noul', noul: 0.92 }, // Notion
				},
			}),
		};

		const result = await filterCredentialsWithJev(
			'Slack support ticket and Notion database',
			candidates,
			{
				client: mockClient,
			},
		);

		expect(mockClient.systemOne).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(3);
		expect(result.map((c) => c.name)).toEqual(['Team Slack', 'Notion account', 'Marketing Slack']);
	});

	it('gracefully returns all candidates as they are when Jev throws an error', async () => {
		const candidates: CredentialCandidate[] = [
			createMockCredential('1', 'Team Slack', 'slackApi'),
			createMockCredential('2', 'Notion account', 'notionApi'),
			createMockCredential('3', 'Linear API Key', 'linearApi'),
		];

		const mockClient: JevDecisionClient = {
			systemOne: vi.fn().mockRejectedValue(new Error('Rate limit or connection error')),
		};

		const result = await filterCredentialsWithJev('Slack', candidates, { client: mockClient });
		expect(result).toEqual(candidates);
	});
});
