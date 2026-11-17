// Compiles one instance of a nodes-base node from its TypeScript source and prints the compiled source, or the
// compile errors. Use it to see what the node compiler makes of one operation.
//
//   node scripts/compile-instance.ts <entry under nodes-base/nodes> <node type> <version> '<parameters JSON>'
//   node scripts/compile-instance.ts Slack/V2/SlackV2.node.ts n8n-nodes-base.slack 2.3 '{"resource":"channel","operation":"get"}'
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NODE_DESCRIPTIONS, NODE_DESCRIPTION_VERSIONS } from '../src/generated/node-descriptions.generated.ts';
import { compileNodeInstance } from '../src/node-compile/convert.ts';

const [entry, type, version, parameters = '{}'] = process.argv.slice(2);
if (!entry || !type || !version) {
	console.error("usage: node scripts/compile-instance.ts <entry> <node type> <version> '<parameters JSON>'");
	process.exit(2);
}
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../nodes-base');
const sources = {
	entry: () => `${base}/nodes/${entry}`,
	readFile: (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : undefined),
	description: (nodeType: string, nodeVersion: number) =>
		NODE_DESCRIPTIONS[NODE_DESCRIPTION_VERSIONS[`${nodeType}@${nodeVersion}`]],
	aliases: { '@utils/': `${base}/utils/` },
};
const result = compileNodeInstance(
	sources,
	{ type, version: Number(version), parameters: JSON.parse(parameters) },
	'a'.repeat(64),
);
console.log('errors' in result ? result.errors : result.source);
