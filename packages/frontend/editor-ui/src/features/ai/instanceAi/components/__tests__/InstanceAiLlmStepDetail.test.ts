import { describe, expect, it } from 'vitest';
import { within } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiLlmStepDetail from '../InstanceAiLlmStepDetail.vue';

const renderDetail = createComponentRenderer(InstanceAiLlmStepDetail);

describe('InstanceAiLlmStepDetail', () => {
	it('renders step settings and tools largest first', () => {
		const { getByTestId } = renderDetail({
			props: {
				input: {
					modelId: 'claude-sonnet',
					providerOptions: { anthropic: { effort: 'medium' } },
					stepTools: [
						{ type: 'function', name: 'small_tool', description: 'x' },
						{ type: 'function', name: 'large_tool', description: 'x'.repeat(2_000) },
					],
				},
			},
		});

		const config = getByTestId('instance-ai-llm-step-config');
		expect(config.textContent).toContain('claude-sonnet');
		expect(config.textContent).toContain('effort');
		expect(config.textContent).toContain('Tools (2)');
		const toolNames = [...config.querySelectorAll('li code')].map((node) => node.textContent);
		expect(toolNames).toEqual(['large_tool', 'small_tool']);
	});

	it('renders usage rows and the cache break detail', () => {
		const { getByTestId } = renderDetail({
			props: {
				output: {
					finishReason: 'tool-calls',
					usage: {
						inputTokens: 1_203,
						inputTokenDetails: { noCacheTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 1_200 },
						outputTokens: 40,
						totalTokens: 1_243,
					},
				},
				cacheBreak: {
					expectedReadTokens: 1_500,
					readTokens: 0,
					lostTokens: 1_500,
					cause: 'expired',
					cacheTtlMinutes: 60,
				},
			},
		});

		const usage = getByTestId('instance-ai-llm-step-usage');
		const rows = [...usage.querySelectorAll('tbody tr')].map(
			(row) => row.querySelector('th')?.textContent,
		);
		expect(rows).toEqual(['input', 'output', 'total']);
		expect(usage.textContent).toContain('cache write');

		const detail = within(usage).getByTestId('instance-ai-llm-step-cache-break-detail');
		expect(detail.textContent).toContain('more than 60 minutes passed');
	});
});
