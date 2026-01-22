const { generateWorkflowCode } = require('../src/codegen');
const { parseWorkflowCode } = require('../src/parse-workflow-code');
const fs = require('fs');

const id = '3790';
const json = JSON.parse(fs.readFileSync('test-fixtures/real-workflows/' + id + '.json'));
const code = generateWorkflowCode(json);

const parsed = parseWorkflowCode(code);
console.log(
	'Nodes:',
	parsed.nodes.map((n: { name: string }) => n.name),
);
console.log('\nConnections:');
for (const [src, conns] of Object.entries(parsed.connections)) {
	console.log('  From:', src);
	for (const [type, outputs] of Object.entries(
		conns as Record<string, Array<Array<{ node: string }>>>,
	)) {
		for (let i = 0; i < outputs.length; i++) {
			if (outputs[i] && outputs[i].length > 0) {
				console.log('    Output', i, ':', outputs[i].map((c) => c.node).join(', '));
			}
		}
	}
}

// Check if Merge has outgoing connections
console.log('\nMerge connections:', parsed.connections['Merge']);
