import { labelForTool } from '../tool-labels';

describe('labelForTool', () => {
	it('resolves a top-level tool label from tool-labels.json', () => {
		expect(labelForTool('workflows')).toBe('Workflows');
	});

	it('prefers an action-specific label over the top-level one', () => {
		expect(labelForTool('workflows', { action: 'list' })).toBe('Listing workflows');
	});

	it('falls back to the top-level label when the action has no dedicated entry', () => {
		expect(labelForTool('workflows', { action: 'not-a-real-action' })).toBe('Workflows');
	});

	it('ignores a non-string action', () => {
		expect(labelForTool('workflows', { action: 42 })).toBe('Workflows');
	});

	it('has a hand-added label for the agents tool, which ships with no upstream i18n entry', () => {
		expect(labelForTool('agents')).toBe('Agents');
	});

	it('never returns the raw tool name for an unmapped tool', () => {
		const label = labelForTool('some_never_before_seen_tool');
		expect(label).not.toBe('some_never_before_seen_tool');
	});

	it('prettifies an unmapped snake_case tool into a human sentence', () => {
		expect(labelForTool('update_workflow')).toBe('Updating the workflow');
	});

	it('prettifies an unmapped multi-word tool name', () => {
		expect(labelForTool('create_data_table')).toBe('Creating the data table');
	});

	it('prettifies a single-word unmapped tool with no trailing object', () => {
		expect(labelForTool('sync')).toBe('Syncing');
	});

	it('uses an irregular gerund for a short CVC-style verb', () => {
		expect(labelForTool('run_export')).toBe('Running the export');
	});
});
