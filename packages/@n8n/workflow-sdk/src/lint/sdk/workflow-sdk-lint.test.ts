import {
	CANVAS_BOX_BUILDERS,
	CONFIG_OR_NODE_BUILDERS,
	lintWorkflowSdkSource,
	NON_CANVAS_SDK_FUNCTIONS,
	prepareSourceForLint,
} from './workflow-sdk-lint';
import { ALLOWED_SDK_FUNCTIONS } from '../../ast-interpreter';

describe('lintWorkflowSdkSource', () => {
	it('flags statements after export default', () => {
		const source = `
import { workflow, node, trigger, ifElse } from '@n8n/workflow-sdk';
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const branch = ifElse({ version: 2.2, config: { name: 'Check', parameters: {} } });
const yes = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Yes' } });
export default workflow('id', 'name').add(start).to(branch);
branch.onTrue(yes);
`;
		const codes = lintWorkflowSdkSource(source).map((i) => i.code);
		expect(codes).toContain('SDK_CODE_AFTER_EXPORT_DEFAULT');
		expect(lintWorkflowSdkSource(source).every((i) => i.lintTarget === 'sdk')).toBe(true);
	});

	it('flags repeated onFalse overwrites on the same IF identifier', () => {
		const issues = lintWorkflowSdkSource(`
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const a = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
const b = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });
const c = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'C' } });
const branch = ifElse({ version: 2.2, config: { name: 'Check', parameters: {} } });
branch.onFalse(b);
branch.onFalse(c);
export default workflow('id', 'name').add(start).to(branch).onTrue(a);
`);
		expect(issues.map((i) => i.code)).toContain('SDK_REPEATED_BRANCH_WIRING');
	});

	it('does not flag fluent onTrue/onFalse across different IF nodes on the workflow chain', () => {
		const source = `
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const a = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
const b = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });
const c = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'C' } });
const d = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'D' } });
const if1 = ifElse({ version: 2.2, config: { name: 'Check1', parameters: {} } });
const if2 = ifElse({ version: 2.2, config: { name: 'Check2', parameters: {} } });
export default workflow('id', 'name')
  .add(start)
  .to(if1)
  .onTrue(a)
  .onFalse(b)
  .to(if2)
  .onTrue(c)
  .onFalse(d);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain(
			'SDK_REPEATED_BRANCH_WIRING',
		);
	});

	it('flags as const', () => {
		const source = `
const mode = 'list' as const;
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_AS_CONST');
	});

	it('does not flag as const inside jsCode template literals', () => {
		const source = `
const transform = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Transform',
    parameters: {
      jsCode: \`
// cast the value as const before returning
return $input.all();
\`.trim(),
    },
  },
});
export default workflow('id', 'name').add(transform);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain('SDK_AS_CONST');
	});

	it('does not flag as const inside string literals', () => {
		const source = `
const note = 'avoid as const in workflow files';
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain('SDK_AS_CONST');
	});

	it('flags placeholder wrapped in expr', () => {
		const source = `
const n = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch', parameters: { url: expr(placeholder('API URL')) } },
});
export default workflow('id', 'name').add(n);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_PLACEHOLDER_WRAPPED');
	});

	it('flags sticky() calls', () => {
		const source = `
const note = sticky('## Notes');
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
export default workflow('id', 'name').add(start).add(note);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_UNSOLICITED_STICKY');
	});

	it('scopes the unsolicited-sticky warning so it does not read as a ban on node groups', () => {
		// A build took this warning as "add no canvas scaffolding" and skipped grouping
		// entirely, then called it an omission rather than a decision.
		const source = `
const note = sticky({ config: { content: 'hi' } });
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
export default workflow('id', 'name').add(start).add(note);
`;
		const issue = lintWorkflowSdkSource(source).find((i) => i.code === 'SDK_UNSOLICITED_STICKY');

		expect(issue?.message).toMatch(/applies to sticky notes only/i);
		expect(issue?.message).toMatch(/node groups are not optional decoration/i);
	});

	it('flags .map() in builder code', () => {
		const source = `
const names = ['a', 'b'].map((x) => x);
export default workflow('id', 'name').add(start);
`;
		const codes = lintWorkflowSdkSource(source).map((i) => i.code);
		expect(codes).toContain('SDK_FORBIDDEN_CONSTRUCT');
	});

	it('does not flag .map inside jsCode template literals', () => {
		const source = `
const transform = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Transform',
    parameters: {
      jsCode: \`
return $input.all().map(item => ({ json: item.json }));
\`.trim(),
    },
  },
});
export default workflow('id', 'name').add(transform);
`;
		const sdkMapIssues = lintWorkflowSdkSource(source).filter((i) =>
			i.message.includes("'.map()'"),
		);
		expect(sdkMapIssues).toHaveLength(0);
	});

	it('does not flag .map inside expr string literals', () => {
		const source = `
const n = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Set',
    parameters: { values: { string: [{ name: 'x', value: expr('={{ $json.items.map(i => i) }}') }] } },
  },
});
export default workflow('id', 'name').add(n);
`;
		const mapIssues = lintWorkflowSdkSource(source).filter((i) => i.message.includes("'.map()'"));
		expect(mapIssues).toHaveLength(0);
	});

	it('does not flag JSON.stringify in builder code', () => {
		const source = `
const payload = JSON.stringify({ a: 1 });
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain(
			'SDK_FORBIDDEN_CONSTRUCT',
		);
	});

	it('still flags raw JSON identifier access', () => {
		const source = `
const payload = JSON;
export default workflow('id', 'name').add(start);
`;
		const issue = lintWorkflowSdkSource(source).find((i) => i.code === 'SDK_FORBIDDEN_CONSTRUCT');
		expect(issue).toMatchObject({ line: 2, column: 17 });
	});

	it('reports 1-based column for as const', () => {
		const source = "const mode = 'list' as const;\nexport default workflow('id', 'name');\n";
		const issue = lintWorkflowSdkSource(source).find((i) => i.code === 'SDK_AS_CONST');
		// prepareSourceForLint records 0-based column 20; issues expose 1-based 21.
		expect(issue).toMatchObject({ line: 1, column: 21 });
	});

	it('still flags JSON.parse', () => {
		const source = `
const payload = JSON.parse('{"x":42}');
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_FORBIDDEN_CONSTRUCT');
	});
});

describe('prepareSourceForLint', () => {
	it('strips imports while preserving line numbers for later statements', () => {
		const source = `import {
  workflow,
  node,
} from '@n8n/workflow-sdk';
const mode = 'list' as const;
export default workflow('id', 'name');
`;
		const prepared = prepareSourceForLint(source);
		expect(prepared.code.includes('import')).toBe(false);
		expect(prepared.asConstMatches).toEqual([{ line: 5, column: 20 }]);
		const asConstLine = prepared.code.split(/\r?\n/)[4];
		expect(asConstLine).toContain("const mode = 'list'");
	});

	it('does not mangle ternaries when stripping type annotations', () => {
		const source = `
const value = flag ? 'a' : 'b';
export default workflow('id', 'name');
`;
		const prepared = prepareSourceForLint(source);
		expect(prepared.code).toContain("flag ? 'a' : 'b'");
	});
});

describe('SDK_UNGROUPED_CANVAS', () => {
	/** A wired chain of `count` plain nodes hanging off a trigger, so every handle
	 *  reaches the canvas. `tail` appends further builder calls. */
	const chain = (count: number, tail = '') => {
		const decls = Array.from(
			{ length: count },
			(_, i) =>
				`const n${i} = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'N${i}' } });`,
		).join('\n');
		const wiring = Array.from({ length: count }, (_, i) => `.to(n${i})`).join('');
		return `
${decls}
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
export default workflow('id', 'name').add(start)${wiring}${tail};
`;
	};

	const issueFor = (source: string) =>
		lintWorkflowSdkSource(source).find((i) => i.code === 'SDK_UNGROUPED_CANVAS');

	it('stays quiet while the canvas fits the ceiling', () => {
		// 6 nodes + trigger = 7 boxes.
		expect(issueFor(chain(6))).toBeUndefined();
	});

	it('flags a source that draws more boxes than a reader can take in', () => {
		const issue = issueFor(chain(7));

		expect(issue?.message).toContain('8 boxes');
		expect(issue?.message).toContain('0 group(s)');
		expect(issue?.severity).toBe('informational');
	});

	it('counts a group as one box and its members as none', () => {
		// 7 nodes + trigger, 5 of them wrapped: 1 group + 3 ungrouped = 4 boxes.
		expect(issueFor(chain(7, ".group('Stage', [n0, n1, n2, n3, n4])"))).toBeUndefined();
	});

	it('counts control-flow builders, which draw their own box', () => {
		const source = `
const gate = ifElse({ config: { name: 'Gate' } });
const route = switchCase({ config: { name: 'Route' } });
const join = merge({ config: { name: 'Join' } });
${chain(4).trim().replace("export default workflow('id', 'name')", "export default workflow('id', 'name').add(gate).add(route).add(join)")}
`;

		// 4 nodes + trigger + 3 control-flow nodes = 8 boxes.
		expect(issueFor(source)?.message).toContain('8 boxes');
	});

	it('counts a loop that builds its own node', () => {
		const source = `
const loop = splitInBatches({ version: 3, config: { name: 'Loop' } }, { done: null, each: null });
${chain(6).trim().replace("export default workflow('id', 'name')", "export default workflow('id', 'name').add(loop)")}
`;

		// 6 nodes + trigger + the loop node = 8 boxes.
		expect(issueFor(source)?.message).toContain('8 boxes');
	});

	it('does not count a loop twice when it wraps a declared node', () => {
		const source = `
const batch = node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { name: 'Batch' } });
const loop = splitInBatches(batch, { done: null, each: null });
${chain(5).trim().replace("export default workflow('id', 'name')", "export default workflow('id', 'name').add(loop)")}
`;

		// 5 nodes + trigger + the batch node = 7 boxes; the wrapper draws nothing of its own.
		expect(issueFor(source)).toBeUndefined();
	});

	it('does not count sub-nodes, which ride with their parent', () => {
		const source = `
const agent = node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1, config: { name: 'Agent' } });
const model = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1, config: { name: 'Model' } });
const mem = memory({ type: '@n8n/n8n-nodes-langchain.memoryPostgresChat', version: 1, config: { name: 'Memory' } });
const search = tool({ type: '@n8n/n8n-nodes-langchain.toolVectorStore', version: 1, config: { name: 'Search' } });
const embed = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1, config: { name: 'Embed' } });
const split = textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter', version: 1, config: { name: 'Split' } });
${chain(5).trim().replace("export default workflow('id', 'name')", "export default workflow('id', 'name').add(agent).add(model).add(mem).add(search).add(embed).add(split)")}
`;

		// Agent + 5 nodes + trigger = 7 boxes; the five sub-nodes are not boxes.
		expect(issueFor(source)).toBeUndefined();
	});

	it('ignores a handle that is declared and never added', () => {
		const source = `
const forgotten = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Forgotten' } });
${chain(6).trim()}
`;

		// The unused handle never reaches the JSON, so the canvas is still 7 boxes.
		expect(issueFor(source)).toBeUndefined();
	});

	it('says nothing when a group member list cannot be read statically', () => {
		// Claiming those nodes are ungrouped would warn about a canvas that is fine.
		const members = 'const members = [n0, n1, n2, n3, n4];';
		const source = chain(7, ".group('Stage', members)").replace(
			'export default',
			`${members}
export default`,
		);

		expect(issueFor(source)).toBeUndefined();
	});
});

describe('canvas box classification', () => {
	it('classifies every function builder source may call', () => {
		// A builder added to the allowlist and to neither set would count as nothing,
		// which is how ifElse, merge and switchCase went missing from the box count.
		const unclassified = [...ALLOWED_SDK_FUNCTIONS].filter(
			(name) =>
				!CANVAS_BOX_BUILDERS.has(name) &&
				!CONFIG_OR_NODE_BUILDERS.has(name) &&
				!NON_CANVAS_SDK_FUNCTIONS.has(name),
		);

		expect(unclassified).toEqual([]);
	});

	it('keeps the three sets disjoint and inside the allowlist', () => {
		const sets = [CANVAS_BOX_BUILDERS, CONFIG_OR_NODE_BUILDERS, NON_CANVAS_SDK_FUNCTIONS];

		for (const set of sets) {
			for (const name of set) {
				expect(ALLOWED_SDK_FUNCTIONS.has(name), name).toBe(true);
				const holders = sets.filter((other) => other.has(name));
				expect(holders, name).toHaveLength(1);
			}
		}
	});
});
