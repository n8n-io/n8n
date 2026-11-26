import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { AGENT_ATTACHMENT_URL_KEY } from '@/features/agents/components/agentChatInjectionKeys';
import { findToolResultRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import AssistantSharedFiles from '../AssistantSharedFiles.vue';
import {
	assistantSharedFilesExtension,
	getShareErrors,
	getSharedFiles,
} from '../assistantSharedFiles';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key}:${JSON.stringify(options.interpolate)}` : key,
	}),
}));

const image = {
	fileId: 'file-1',
	fileName: 'chart.png',
	mimeType: 'image/png',
	sizeBytes: 2048,
};

function toolCall(overrides: Partial<ToolCall> = {}): ToolCall {
	return {
		tool: 'share-files',
		toolCallId: 'call-1',
		input: { paths: ['chart.png'] },
		output: { files: [image] },
		state: 'done',
		...overrides,
	};
}

describe('assistantSharedFilesExtension', () => {
	it('renders a finished share-files call that shared a file', () => {
		expect(findToolResultRenderer(toolCall(), [assistantSharedFilesExtension])).toEqual({
			key: 'assistant_shared_files',
			component: assistantSharedFilesExtension.resultComponent,
		});
	});

	it('keeps a call that shared no file as a step, so its errors show', () => {
		const failed = toolCall({
			output: { files: [], errors: [{ path: 'chart.png', error: 'Not found' }] },
		});
		expect(findToolResultRenderer(failed, [assistantSharedFilesExtension])).toBeUndefined();
	});

	it('does not render the files of other tools', () => {
		expect(getSharedFiles(toolCall({ tool: 'parse-file' }))).toEqual([]);
		expect(
			findToolResultRenderer(toolCall({ tool: 'parse-file' }), [assistantSharedFilesExtension]),
		).toBeUndefined();
	});

	it('reads the failed paths of a share-files call', () => {
		const mixed = toolCall({
			output: {
				files: [image],
				errors: [{ path: 'missing.csv', error: 'Not found' }, { path: 42 }],
			},
		});
		expect(getShareErrors(mixed)).toEqual([{ path: 'missing.csv', error: 'Not found' }]);
		expect(getShareErrors(toolCall())).toEqual([]);
		expect(getShareErrors(toolCall({ tool: 'parse-file', output: mixed.output }))).toEqual([]);
	});

	it('does not render a call that is still running', () => {
		const running = toolCall({ state: 'running', output: undefined });
		expect(findToolResultRenderer(running, [assistantSharedFilesExtension])).toBeUndefined();
	});
});

describe('AssistantSharedFiles', () => {
	it('shows the shared files with the download URLs of the chat panel', () => {
		const wrapper = mount(AssistantSharedFiles, {
			props: { toolCall: toolCall() },
			global: {
				provide: {
					[AGENT_ATTACHMENT_URL_KEY as symbol]: (id: string) => `/rest/system/attachments/${id}`,
				},
			},
		});

		expect(wrapper.find('[data-testid="assistant-shared-files"]').exists()).toBe(true);
		expect(wrapper.find('img').attributes('src')).toBe('/rest/system/attachments/file-1');
		expect(wrapper.find('[data-testid="assistant-shared-files-error"]').exists()).toBe(false);
	});

	it('shows the paths that failed next to the shared files', () => {
		const wrapper = mount(AssistantSharedFiles, {
			props: {
				toolCall: toolCall({
					output: {
						files: [image],
						errors: [{ path: 'missing.csv', error: 'Not found' }],
					},
				}),
			},
			global: {
				provide: {
					[AGENT_ATTACHMENT_URL_KEY as symbol]: (id: string) => `/rest/system/attachments/${id}`,
				},
			},
		});

		const errors = wrapper.findAll('[data-testid="assistant-shared-files-error"]');
		expect(errors).toHaveLength(1);
		expect(errors[0].text()).toBe(
			'instanceAi.assistantAgent.sharedFiles.failed:{"path":"missing.csv"}',
		);
		expect(errors[0].attributes('title')).toBe('Not found');
	});
});
