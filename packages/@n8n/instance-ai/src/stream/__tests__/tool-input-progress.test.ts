import { ToolInputProgressTracker } from '../tool-input-progress';

const start = (toolName: string, toolCallId = 'tc-1') => ({
	type: 'tool-input-start',
	toolCallId,
	toolName,
});
const delta = (text: string, toolCallId = 'tc-1') => ({
	type: 'tool-input-delta',
	toolCallId,
	delta: text,
});

/** The source as the model streams it: a JSON string inside the tool arguments. */
function asArgs(source: string): string {
	return `{"path":"src/workflows/demo.workflow.ts","content":${JSON.stringify(source)}`;
}

const SOURCE = [
	"const schedule = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2,",
	"  config: { name: 'Every Morning' } });",
	'const gmail = node({ type: "n8n-nodes-base.gmail", version: 2.1,',
	'  config: { name: "Read Invoices", parameters: {} } });',
].join('\n');

describe('ToolInputProgressTracker', () => {
	it('reports the node names written so far in a workflow source', () => {
		const tracker = new ToolInputProgressTracker();
		tracker.observe(start('workspace_write_file'), 0);

		const progress = tracker.observe(delta(asArgs(SOURCE)), 10);

		expect(progress).toEqual({ toolCallId: 'tc-1', nodeNames: ['Every Morning', 'Read Invoices'] });
	});

	it('finds names split across deltas', () => {
		const tracker = new ToolInputProgressTracker();
		tracker.observe(start('workspace_write_file'), 0);
		const args = asArgs(SOURCE);
		const cut = args.indexOf('Morning') + 3;

		tracker.observe(delta(args.slice(0, cut)), 10);
		const progress = tracker.observe(delta(args.slice(cut)), 5000);

		expect(progress?.nodeNames).toEqual(['Every Morning', 'Read Invoices']);
	});

	it('reports at most once every 2 seconds for each call', () => {
		const tracker = new ToolInputProgressTracker();
		tracker.observe(start('workspace_write_file'), 0);
		const args = asArgs(SOURCE);
		const cut = args.indexOf('const gmail');

		expect(tracker.observe(delta(args.slice(0, cut)), 100)).toBeDefined();
		expect(tracker.observe(delta(args.slice(cut)), 1000)).toBeUndefined();
		expect(tracker.observe(delta(' '), 2200)).toMatchObject({
			nodeNames: ['Every Morning', 'Read Invoices'],
		});
	});

	it('reports nothing when no new node name was written', () => {
		const tracker = new ToolInputProgressTracker();
		tracker.observe(start('workspace_write_file'), 0);
		tracker.observe(delta(asArgs(SOURCE)), 10);

		expect(tracker.observe(delta('// more code'), 5000)).toBeUndefined();
	});

	it.each(['workspace_str_replace_file', 'workflow_builder_build_workflow'])(
		'tracks %s',
		(toolName) => {
			const tracker = new ToolInputProgressTracker();
			tracker.observe(start(toolName), 0);

			expect(tracker.observe(delta(asArgs(SOURCE)), 10)).toBeDefined();
		},
	);

	it('ignores other tools', () => {
		const tracker = new ToolInputProgressTracker();
		tracker.observe(start('search_nodes'), 0);

		expect(tracker.observe(delta(asArgs(SOURCE)), 10)).toBeUndefined();
	});

	it('stops when the full tool call arrives', () => {
		const tracker = new ToolInputProgressTracker();
		tracker.observe(start('workspace_write_file'), 0);
		tracker.observe({ type: 'tool-call', toolCallId: 'tc-1', toolName: 'workspace_write_file' }, 5);

		expect(tracker.observe(delta(asArgs(SOURCE)), 10)).toBeUndefined();
	});

	it('keeps at most 50 node names', () => {
		const tracker = new ToolInputProgressTracker();
		tracker.observe(start('workspace_write_file'), 0);
		const source = Array.from(
			{ length: 60 },
			(_, i) => `node({ config: { name: 'Node ${i}' } });`,
		).join('\n');

		expect(tracker.observe(delta(asArgs(source)), 10)?.nodeNames).toHaveLength(50);
	});

	it('ignores chunks that are not tool input chunks', () => {
		const tracker = new ToolInputProgressTracker();

		expect(tracker.observe({ type: 'text-delta', delta: 'hi' }, 0)).toBeUndefined();
		expect(tracker.observe('not a chunk', 0)).toBeUndefined();
	});
});
