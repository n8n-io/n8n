import { promptTypeOptions } from '@utils/descriptions';

import { Agent } from '../../../agents/Agent/Agent.node';
import { DatabricksAiAgent } from '../DatabricksAiAgent.node';

// The Databricks AI Agent is AI Agent 2.2 plus trace export. These are the only
// differences the panel may have: the trace fields on one side and, on the
// other, the deprecated Guardrails prompt source that #22435 removed from new
// agent versions.
const DATABRICKS_ONLY = ['exportTraces', 'experiment'];

describe('DatabricksAiAgent', () => {
	const agentProps = new Agent().nodeVersions[2.2].description.properties.filter(
		(p) => p.disabledOptions?.show?.promptType?.[0] !== 'guardrails',
	);
	const databricksProps = new DatabricksAiAgent().description.properties.filter(
		(p) => !DATABRICKS_ONLY.includes(p.name),
	);

	it('shows the AI Agent 2.2 properties after the prompt source, in the same order', () => {
		expect(databricksProps.slice(1)).toEqual(agentProps.slice(1));
	});

	it('uses the current prompt source list without the Guardrails option', () => {
		expect(databricksProps[0]).toEqual(promptTypeOptions);
		const values = databricksProps[0].options?.map((o) => ('value' in o ? o.value : undefined));
		expect(values).not.toContain('guardrails');
	});

	it('is visible in the node picker and links its docs page', () => {
		const { description } = new DatabricksAiAgent();
		expect(description.hidden).toBeUndefined();
		expect(description.codex?.resources?.primaryDocumentation?.[0]?.url).toBe(
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.databricksaiagent/',
		);
	});
});
