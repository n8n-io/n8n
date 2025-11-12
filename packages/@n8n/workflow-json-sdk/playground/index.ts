/* eslint-disable id-denylist */
import fs from 'fs';

import { workflow, NodeTypes } from '../src';

function createTestWorkflow() {
	const wf = workflow({ name: 'My workflow' });

	const manualTrigger = wf.node('Manual Trigger').type(NodeTypes.ManualTrigger).parameters({});
	const setA = wf
		.node('Edit Fields A')
		.type(NodeTypes.Set_v3_4)
		.position(200, -150)
		.parameters({ options: {} });
	const setB = wf
		.node('Edit Fields B')
		.type(NodeTypes.Set_v3_4)
		.position(200, 0)
		.parameters({ options: {} });
	const setC = wf
		.node('Edit Fields C')
		.type(NodeTypes.Set_v3_4)
		.position(200, 150)
		.parameters({
			values: {
				string: [
					{
						value: 'n8n',
					},
				],
			},
		});
	const notion = wf
		.node('Search a page on Notion')
		.type(NodeTypes.Notion_v2_2)
		.position(400, 0)
		.parameters({
			operation: 'search',
		});

	wf.connection().from(manualTrigger).to([setA, setB]);
	wf.connection()
		.from({ node: manualTrigger, type: 'main', index: 0 })
		.to([setA, setB])
		.to({ node: setC, type: 'main', index: 0 });
	wf.connection().from(setB).to(notion);

	return wf.toJSON();
}

const workflowJSON = createTestWorkflow();

fs.writeFileSync('output.json', JSON.stringify(workflowJSON, null, 4), 'utf-8');
