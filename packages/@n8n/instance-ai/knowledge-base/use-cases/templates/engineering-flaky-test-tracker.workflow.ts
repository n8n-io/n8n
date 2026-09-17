// Use case: engineering / Flaky test tracker.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Database table, run once:
//   CREATE TABLE test_results (id serial PRIMARY KEY, commit_sha text, run_id text,
//     test_name text, status text, created_at timestamptz DEFAULT now());
import { workflow, node, trigger, newCredential, placeholder, expr } from '@n8n/workflow-sdk';

// Your CI posts JSON here: { commit, run_id, failed: [names], passed: [names] }.
const ciResults = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'CI Test Results',
		parameters: { httpMethod: 'POST', path: 'ci-test-results', responseMode: 'onReceived' },
		output: [
			{
				body: {
					commit: 'a1b2c3d',
					run_id: '5511',
					failed: ['auth.spec.ts > login'],
					passed: ['auth.spec.ts > logout'],
				},
			},
		],
	},
});

// Tool-neutral step: one item per test result.
const splitResults = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Split Results',
		parameters: {
			mode: 'runOnceForAllItems',
			jsCode: `const body = $input.first().json.body || {};
const rows = [];
for (const test of body.failed || []) rows.push({ json: { commit: body.commit, run_id: String(body.run_id), test, status: 'failed' } });
for (const test of body.passed || []) rows.push({ json: { commit: body.commit, run_id: String(body.run_id), test, status: 'passed' } });
return rows;`,
		},
	},
});

// [database] Postgres. Swap for MySQL, Supabase or MongoDB: replace this node and the next
// one. It reads $json.commit, $json.run_id, $json.test and $json.status.
const storeResults = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Store Results',
		credentials: { postgres: newCredential('Postgres account') },
		parameters: {
			operation: 'executeQuery',
			query:
				'INSERT INTO test_results (commit_sha, run_id, test_name, status) VALUES ($1, $2, $3, $4)',
			options: {
				queryReplacement: expr(
					'{{ $json.commit }},{{ $json.run_id }},{{ $json.test }},{{ $json.status }}',
				),
			},
		},
	},
});

// [database] Postgres: tests that failed and passed on the same commit, three times in a week.
// The next node reads $json.test_name and $json.flips.
const findFlakyTests = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Find Flaky Tests',
		executeOnce: true,
		credentials: { postgres: newCredential('Postgres account') },
		parameters: {
			operation: 'executeQuery',
			query: `SELECT test_name, count(*) AS flips
FROM (
  SELECT test_name, commit_sha
  FROM test_results
  WHERE created_at > now() - interval '7 days'
  GROUP BY test_name, commit_sha
  HAVING count(DISTINCT status) > 1
) flaky
GROUP BY test_name
HAVING count(*) >= 3`,
		},
		output: [{ test_name: 'auth.spec.ts > login', flips: '3' }],
	},
});

// [issue tracker] Jira. Swap for Linear, GitHub Issues, Asana, Trello or ClickUp: replace
// this node only. It reads $json.test_name and $json.flips.
const openTask = node({
	type: 'n8n-nodes-base.jira',
	version: 1,
	config: {
		name: 'Open Jira Task',
		credentials: { jiraSoftwareCloudApi: newCredential('Jira account') },
		parameters: {
			resource: 'issue',
			operation: 'create',
			jiraVersion: 'cloud',
			project: { __rl: true, mode: 'id', value: placeholder('Jira project id') },
			issueType: {
				__rl: true,
				mode: 'id',
				value: placeholder('Jira issue type id, for example the id of Task'),
			},
			summary: expr('{{ "Flaky test: " + $json.test_name }}'),
			additionalFields: {
				description: expr(
					'{{ "The test " + $json.test_name + " failed and passed on the same commit " + $json.flips + " times in the last 7 days." }}',
				),
			},
		},
	},
});

export default workflow('id', 'Flaky Test Tracker')
	.add(ciResults)
	.to(splitResults)
	.to(storeResults)
	.to(findFlakyTests)
	.to(openTask);
