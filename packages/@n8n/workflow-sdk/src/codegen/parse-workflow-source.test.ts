import { parseWorkflowSource } from './parse-workflow-source';

const SOURCE = `import { workflow, node, trigger } from '@n8n/workflow-sdk';

const start = trigger({
	type: 'n8n-nodes-base.manualTrigger',
	version: 1,
	config: { name: 'Start' },
});

const setFields = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: { name: 'Set Fields', parameters: {} },
});

export default workflow('wf-1', 'Draft Workflow').add(start).to(setFields);
`;

describe('parseWorkflowSource', () => {
	it('should parse a workflow source file that imports the SDK', () => {
		const json = parseWorkflowSource(SOURCE);

		expect(json.name).toBe('Draft Workflow');
		expect(json.nodes.map((node) => node.name)).toEqual(['Start', 'Set Fields']);
		expect(json.connections.Start?.main?.[0]?.[0]?.node).toBe('Set Fields');
	});

	it('should give every node a laid-out position', () => {
		const json = parseWorkflowSource(SOURCE);

		const [start, setFields] = json.nodes;
		expect(start.position).toHaveLength(2);
		expect(setFields.position[0]).toBeGreaterThan(start.position[0]);
	});

	it('should accept TypeScript type annotations on declarations', () => {
		const typed = SOURCE.replace('const start =', 'const start: ReturnType<typeof trigger> =');

		expect(parseWorkflowSource(typed).nodes).toHaveLength(2);
	});

	it('should keep object properties that follow a comma', () => {
		const withProperties = SOURCE.replace(
			"config: { name: 'Set Fields', parameters: {} },",
			"config: { name: 'Set Fields', parameters: { mode: expr('{{ 1 }}'), keepOnlySet: true, includeBinary: false } },",
		).replace('import { workflow, node, trigger }', 'import { workflow, node, trigger, expr }');

		const setFields = parseWorkflowSource(withProperties).nodes[1];

		expect(setFields.parameters).toMatchObject({ keepOnlySet: true, includeBinary: false });
	});

	it('should throw when the source is not a complete workflow', () => {
		expect(() => parseWorkflowSource(SOURCE.slice(0, SOURCE.length / 2))).toThrow();
	});
});
