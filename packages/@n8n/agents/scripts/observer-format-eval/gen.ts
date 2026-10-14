// Generates synthetic Instance AI transcripts in the Observer's rendered format.
// Writes data/s<scenario>-p<part>.txt and skips files that already exist.
import { generateText } from 'ai';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { createModel } from '../../src/runtime/model/model-factory';

const model = createModel({
	id: 'anthropic/claude-sonnet-5-5',
	apiKey: process.env.N8N_AI_ANTHROPIC_KEY,
});

// Each scenario favours list-shaped facts (rules, IDs, versions, open questions),
// which is the content that makes the Observer write nested detail lists.
const SCENARIOS = [
	'Invoice intake: user forwards vendor invoice PDFs, agent builds a workflow that extracts line items into a data table. Many business rules (approval statuses, duplicate invoice numbers, cost-centre reassignment), corrected counts, execution IDs and per-file line counts.',
	'CRM sync between Pipedrive and HubSpot: agent edits several workflows, publishes versions, keeps drafts, rolls back once. Lots of workflow IDs, version IDs, field mappings and a list of open questions for the user.',
	'WhatsApp customer support bot: agent asks the user several numbered setup questions (which bridge, webhook URL, verify token, business hours), user answers some, agent builds and tests; some executions fail.',
	'Translation quality checks (French-speaking user): glossary file versions loaded from GitHub with commit SHAs, reference test runs with pass counts, helper workflows archived, multiple data tables with IDs, planned test cases 1-6 with expectations.',
	'Weekly report scheduling with exceptions: recurring Tuesday report in Europe/London, temporary Wednesday overrides on specific dates, skipped weeks, resumption date; agent edits the schedule trigger and verifies runs.',
	'Debugging a failing Postgres-backed workflow: advisory locks, conversation_id hashing, several SQL snippets, error messages, execution IDs, root cause unconfirmed then confirmed, list of follow-up steps.',
	'Multi-workflow refactor of an invoicing system: subworkflows extracted, list of nodes renamed, credentials swapped, per-workflow test results, customer and supplier numbering schemes.',
	'Data migration of a customer table into n8n data tables: column mappings, row counts per batch, rejected rows with reasons, user decisions about de-duplication and which rows to keep.',
];

const FORMAT = `Write a realistic raw transcript of a session between a user and the n8n AI assistant (an agent that builds and runs n8n workflows using tools). Use EXACTLY this line format and nothing else (no commentary, no code fences):

[2026-10-14T09:00:00.000Z] user:
<message text, can be multiple lines>
[2026-10-14T09:00:05.000Z] assistant:
<message text>
[2026-10-14T09:00:06.000Z] tool_call build-workflow input={"json":"inputs"}
[2026-10-14T09:00:06.000Z] tool_result build-workflow output=<untrusted_tool_data source="build-workflow">{"json":"result with ids, counts, versions"}</untrusted_tool_data>

Use tools such as build-workflow, run-workflow, get-execution, list-workflows, data-table-query, data-table-insert, publish-workflow, patch-config, ask-user, web-fetch. Tool results must be realistic JSON with concrete IDs (workflow ids like 4hsFBOHa7hIJ6TZg, execution numbers, version UUIDs, commit SHAs), counts and field values. Assistant messages should often contain structured lists (bullets, numbered steps, expectations). Timestamps increase monotonically.`;

async function main() {
	// Parts continue earlier parts, so scenarios run in parallel and parts in order.
	await Promise.all(
		SCENARIOS.map(async (scenario, i) => {
			let previous = '';
			for (const part of [1, 2, 3]) {
				const file = `data/s${i + 1}-p${part}.txt`;
				if (existsSync(file)) {
					previous = readFileSync(file, 'utf8');
					continue;
				}
				const { text, finishReason } = await generateText({
					model,
					maxOutputTokens: 32000,
					prompt: `${FORMAT}\n\nScenario: ${scenario}\n\n${
						part === 1
							? 'Write part 1 of 3 of this session (about 12000 words, at least 25 tool calls).'
							: `Write part ${part} of 3, continuing directly after the end of the previous part (about 12000 words, at least 25 tool calls). The previous part ended with:\n\n${previous.slice(-6000)}`
					}`,
				});
				// An empty part (content filter, length) ends the scenario; later parts need it.
				if (!text.trim()) {
					console.log(file, 'EMPTY', finishReason);
					return;
				}
				writeFileSync(file, text.trim());
				previous = text;
				console.log(file, text.length);
			}
		}),
	);
}

void main();
