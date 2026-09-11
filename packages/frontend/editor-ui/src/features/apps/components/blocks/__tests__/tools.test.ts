import { createPinia, setActivePinia } from 'pinia';
import type { API, BlockToolConstructorOptions } from '@editorjs/editorjs';

import { TableBlockTool } from '@/features/apps/components/blocks/TableBlockTool.tool';
import { FormBlockTool } from '@/features/apps/components/blocks/FormBlockTool.tool';
import { ButtonBlockTool } from '@/features/apps/components/blocks/ButtonBlockTool.tool';
import { HtmlBlockTool } from '@/features/apps/components/blocks/HtmlBlockTool.tool';
import {
	CodeBlockTool,
	DEFAULT_CODE_BLOCK_SOURCE,
} from '@/features/apps/components/blocks/CodeBlockTool.tool';
import { ImageBlockTool } from '@/features/apps/components/blocks/ImageBlockTool.tool';
import { SlotBlockTool } from '@/features/apps/components/blocks/SlotBlockTool.tool';
import { AgentChatBlockTool } from '@/features/apps/components/blocks/AgentChatBlockTool.tool';

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: () => ({
		dataTables: [],
		fetchDataTables: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ fetchWorkflowsPage: vi.fn().mockResolvedValue([]) }),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPage: vi.fn().mockResolvedValue({ count: 0, data: [] }),
}));

describe('Editor.js custom block tools', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('TableBlockTool renders a config card and round-trips its data through save()', () => {
		const data = { source: { dataTableId: 'dt1' }, limit: 50 };
		const tool = new TableBlockTool({
			data,
			config: { projectId: 'p1' },
		} as BlockToolConstructorOptions);

		const element = tool.render();

		expect(element).toBeInstanceOf(HTMLElement);
		expect(element.querySelector('[data-test-id="table-block-editable"]')).not.toBeNull();
		expect(element.querySelector('[data-test-id="table-block-deletable"]')).not.toBeNull();
		expect(tool.save()).toEqual(data);
	});

	it('TableBlockTool keeps editable and deletable only when set', () => {
		const data = { source: { dataTableId: 'dt1' }, limit: 50, editable: true };
		const tool = new TableBlockTool({
			data,
			config: { projectId: 'p1' },
		} as BlockToolConstructorOptions);

		tool.render();

		expect(tool.save()).toEqual(data);
	});

	it('FormBlockTool renders a config card and round-trips its data through save()', () => {
		const data = { workflowId: 'wf1', submitLabel: 'Send' };
		const tool = new FormBlockTool({
			data,
			config: { projectId: 'p1' },
		} as BlockToolConstructorOptions);

		tool.render();

		expect(tool.save()).toEqual(data);
	});

	it('ButtonBlockTool reads code block ids from the Editor.js API for the action target picker', () => {
		const data = {
			label: 'Go',
			style: 'primary' as const,
			target: { kind: 'action' as const, blockId: 'b1', action: 'run' },
		};
		const api: API = {
			blocks: {
				getBlocksCount: () => 1,
				getBlockByIndex: () =>
					({ id: 'b1', name: 'code' }) as ReturnType<API['blocks']['getBlockByIndex']>,
			},
		} as unknown as API;
		const tool = new ButtonBlockTool({
			data,
			api,
			config: { projectId: 'p1' },
		} as BlockToolConstructorOptions);

		tool.render();

		expect(tool.save()).toEqual(data);
	});

	it('ImageBlockTool round-trips url, alt and caption through save()', () => {
		const data = { url: 'https://example.com/x.png', alt: 'x', caption: 'c' };
		const tool = new ImageBlockTool({ data } as BlockToolConstructorOptions);

		const element = tool.render();

		expect(element.querySelector('img')?.getAttribute('src')).toBe(data.url);
		expect(tool.save()).toEqual(data);
	});

	it('HtmlBlockTool round-trips its template through save()', () => {
		const data = { template: '<p>{{ params.name }}</p>' };
		const tool = new HtmlBlockTool({ data } as BlockToolConstructorOptions);

		tool.render();

		expect(tool.save()).toEqual(data);
	});

	it('CodeBlockTool round-trips its source through save()', () => {
		const data = { source: 'export function render() { return "<p></p>"; }' };
		const tool = new CodeBlockTool({ data } as BlockToolConstructorOptions);

		tool.render();

		expect(tool.save()).toEqual(data);
	});

	it.each([{}, { source: '' }])(
		'CodeBlockTool starts a new block from the render template when data is %o',
		(data) => {
			const tool = new CodeBlockTool({ data } as BlockToolConstructorOptions);

			tool.render();

			expect(tool.save()).toEqual({ source: DEFAULT_CODE_BLOCK_SOURCE });
		},
	);

	it('AgentChatBlockTool renders a config card and round-trips its data through save()', () => {
		const data = { agentId: 'agent-1', welcome: 'Hi', placeholder: 'Ask' };
		const tool = new AgentChatBlockTool({
			data,
			config: { projectId: 'p1' },
		} as BlockToolConstructorOptions);

		const element = tool.render();

		expect(element.querySelector('[data-test-id="agent-chat-block-agent-select"]')).not.toBeNull();
		expect(tool.save()).toEqual(data);
	});

	it('SlotBlockTool renders a static card and saves empty data', () => {
		const tool = new SlotBlockTool();

		const element = tool.render();

		expect(element.querySelector('[data-test-id="slot-block-card"]')?.textContent).toContain(
			'Page content',
		);
		expect(tool.save()).toEqual({});
	});

	it.each([
		TableBlockTool,
		FormBlockTool,
		ButtonBlockTool,
		HtmlBlockTool,
		CodeBlockTool,
		ImageBlockTool,
		SlotBlockTool,
		AgentChatBlockTool,
	])('%o keeps Enter inside its inputs instead of splitting the block', (tool) => {
		expect(tool.enableLineBreaks).toBe(true);
	});
});
