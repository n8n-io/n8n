import { node, trigger, workflow } from '../index';
import { validateWorkflowBuilder } from './validate-workflow-builder';

describe('validateWorkflowBuilder', () => {
	it('runs graph + schema and partitions informational severity', () => {
		const orphan = node({
			type: 'n8n-nodes-base.set',
			version: 3,
			config: { name: 'Orphan' },
		});
		const wf = workflow('id', 'name').add(orphan);

		const result = validateWorkflowBuilder(wf);

		expect(result.valid).toBe(true);
		expect(result.ok).toBe(true);
		expect(result.informational.some((issue) => issue.code === 'MISSING_TRIGGER')).toBe(true);
		expect(result.informational.some((issue) => issue.code === 'DISCONNECTED_NODE')).toBe(true);
		expect(result.blocking).toHaveLength(0);
	});

	it('includes source lint when lint: true and source is provided', () => {
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const wf = workflow('id', 'name').add(t);
		const source = `
import { sticky, trigger, workflow } from '@n8n/workflow-sdk';
const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const note = sticky('hi');
export default workflow('id', 'name').add(t).add(note);
`;

		const result = validateWorkflowBuilder(wf, { lint: true, source });

		expect(result.lint.some((issue) => issue.code === 'SDK_UNSOLICITED_STICKY')).toBe(true);
		expect(result.informational.some((issue) => issue.code === 'SDK_UNSOLICITED_STICKY')).toBe(
			true,
		);
		expect(result.ok).toBe(true);
	});

	it('skips lint when lint is not requested', () => {
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const wf = workflow('id', 'name').add(t);
		const source = `const note = sticky('hi'); export default workflow('id','n').add(note);`;

		const result = validateWorkflowBuilder(wf, { source });

		expect(result.lint).toHaveLength(0);
	});
});
