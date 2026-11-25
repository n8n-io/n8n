import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { nodeSimulationGap } from '../non-http-node-types';

/**
 * Some first-party nodes change data stored in n8n without an HTTP request, so the simulator
 * never sees them. This test reads every node source in `n8n-nodes-base` and fails when a node
 * calls one of the n8n data helpers below without a review here.
 */

const NODES_DIR = join(dirname(require.resolve('n8n-nodes-base/package.json')), 'nodes');

/** Context helpers that read or write n8n data, or run something outside the test run. */
const STATE_HELPER_CALL =
	/\b(getDataTableProxy|checkProcessedAndRecord|checkProcessedItemsAndRecord|removeProcessed|clearAllProcessedItems|getProcessedDataCount|executeAgent|executeWorkflow)\(/;

/**
 * Every node folder that calls a helper above, and how a test run keeps it from running. A
 * node blocked only for some operations lists them.
 */
const REVIEWED_FOLDERS: Record<
	string,
	{ blocked: string[]; blockedOperations?: { nodeType: string; operations: string[] } }
> = {
	DataTable: { blocked: ['n8n-nodes-base.dataTable'] },
	Evaluation: { blocked: ['n8n-nodes-base.evaluation', 'n8n-nodes-base.evaluationTrigger'] },
	ExecuteWorkflow: { blocked: ['n8n-nodes-base.executeWorkflow'] },
	MessageAnAgent: { blocked: ['n8n-nodes-base.messageAnAgent'] },
	'Transform/RemoveDuplicates': {
		blocked: [],
		blockedOperations: {
			nodeType: 'n8n-nodes-base.removeDuplicates',
			operations: ['removeItemsSeenInPreviousExecutions', 'clearDeduplicationHistory'],
		},
	},
};

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === '__tests__' || entry.name === 'test' ? [] : sourceFiles(path);
		}
		return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
	});
}

function reviewedFolder(path: string): string | undefined {
	return Object.keys(REVIEWED_FOLDERS)
		.sort((a, b) => b.length - a.length)
		.find((folder) => path.startsWith(`${folder}/`));
}

describe('n8n-nodes-base n8n data helpers', () => {
	const callers = sourceFiles(NODES_DIR)
		.filter((file) => STATE_HELPER_CALL.test(readFileSync(file, 'utf8')))
		.map((file) => relative(NODES_DIR, file).split(sep).join('/'));

	it('finds the nodes that call an n8n data helper', () => {
		expect(callers.length).toBeGreaterThan(0);
	});

	it('has a review for every node folder that calls an n8n data helper', () => {
		// A new caller: block its node in non-http-node-types.ts and add the folder here.
		expect(callers.filter((path) => !reviewedFolder(path))).toEqual([]);
	});

	it.each(Object.entries(REVIEWED_FOLDERS))(
		'blocks the n8n data nodes in %s',
		(_folder, review) => {
			for (const nodeType of review.blocked) {
				expect(nodeSimulationGap(nodeType)).toEqual(expect.any(String));
			}
			const { nodeType, operations = [] } = review.blockedOperations ?? {};
			for (const operation of operations) {
				expect(nodeSimulationGap(nodeType!, { operation })).toEqual(expect.any(String));
			}
		},
	);
});
