import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { checkSemanticIssues } from '../semantic-checks';

type WorkflowNode = WorkflowJSON['nodes'][number];

function workflow(nodes: WorkflowNode[], connections: WorkflowJSON['connections']): WorkflowJSON {
	return { name: 'test', nodes, connections } satisfies WorkflowJSON;
}

function node(partial: Omit<WorkflowNode, 'id' | 'position'> & { id?: string }): WorkflowNode {
	return {
		id: partial.id ?? `n_${partial.name ?? Math.random().toString(36).slice(2, 8)}`,
		position: [0, 0],
		...partial,
	};
}

describe('semantic-checks', () => {
	describe('post-agent trigger-data $json references', () => {
		const telegramTrigger = node({
			name: 'Telegram Trigger',
			type: 'n8n-nodes-base.telegramTrigger',
			typeVersion: 1.2,
			parameters: {},
		});

		const agent = node({
			name: 'Family AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.6,
			parameters: {},
		});

		test('flags Telegram send chatId reading $json.message.chat.id after an Agent', () => {
			const wf = workflow(
				[
					telegramTrigger,
					agent,
					node({
						name: 'Send Response',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						parameters: {
							operation: 'sendMessage',
							chatId: '={{ $json.message.chat.id }}',
							text: '={{ $json.output }}',
						},
					}),
				],
				{
					'Telegram Trigger': { main: [[{ node: 'Family AI Agent', type: 'main', index: 0 }]] },
					'Family AI Agent': { main: [[{ node: 'Send Response', type: 'main', index: 0 }]] },
				},
			);
			const issues = checkSemanticIssues(wf);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'TRIGGER_JSON_REF_AFTER_AGENT',
					nodeName: 'Send Response',
				}),
			]);
			expect(issues[0].message).toContain("$('Telegram Trigger').item.json.message");
			expect(issues[0].message).toContain('Family AI Agent');
		});

		test('does not flag Telegram send when chatId already uses $(Trigger).item.json', () => {
			const wf = workflow(
				[
					telegramTrigger,
					agent,
					node({
						name: 'Send Response',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						parameters: {
							operation: 'sendMessage',
							chatId: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							text: '={{ $json.output }}',
						},
					}),
				],
				{
					'Telegram Trigger': { main: [[{ node: 'Family AI Agent', type: 'main', index: 0 }]] },
					'Family AI Agent': { main: [[{ node: 'Send Response', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('does not flag a Telegram send directly after the Telegram Trigger (no agent in the path)', () => {
			const wf = workflow(
				[
					telegramTrigger,
					node({
						name: 'Echo',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						parameters: {
							operation: 'sendMessage',
							chatId: '={{ $json.message.chat.id }}',
							text: '={{ $json.message.text }}',
						},
					}),
				],
				{
					'Telegram Trigger': { main: [[{ node: 'Echo', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('does not flag the agent itself reading $json.message', () => {
			// Agents legitimately read $json from their own input.
			const wf = workflow(
				[
					telegramTrigger,
					node({
						id: agent.id,
						name: agent.name,
						type: agent.type,
						typeVersion: agent.typeVersion,
						parameters: {
							text: '={{ $json.message.text }}',
						},
					}),
				],
				{
					'Telegram Trigger': { main: [[{ node: 'Family AI Agent', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('does not flag references that only use $json.output (valid agent output path)', () => {
			const wf = workflow(
				[
					telegramTrigger,
					agent,
					node({
						name: 'Send Response',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						parameters: {
							operation: 'sendMessage',
							chatId: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							text: '={{ $json.output }}',
						},
					}),
				],
				{
					'Telegram Trigger': { main: [[{ node: 'Family AI Agent', type: 'main', index: 0 }]] },
					'Family AI Agent': { main: [[{ node: 'Send Response', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('flags webhook $json.body.* references through an agent', () => {
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						id: 'agent_triage',
						name: 'Triage Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.6,
						parameters: {},
					}),
					node({
						name: 'Forward',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						parameters: {
							url: '={{ $json.body.callbackUrl }}',
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Triage Agent', type: 'main', index: 0 }]] },
					'Triage Agent': { main: [[{ node: 'Forward', type: 'main', index: 0 }]] },
				},
			);
			const issues = checkSemanticIssues(wf);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'TRIGGER_JSON_REF_AFTER_AGENT',
					nodeName: 'Forward',
				}),
			]);
			expect(issues[0].message).toContain("$('Webhook').item.json.body");
		});
	});

	describe('post-non-trigger trigger-data $json references (general)', () => {
		test('flags Telegram send chatId reading $json.body.X downstream of a Gmail node (sequential chain)', () => {
			// Mirrors the contact-form-automation failure mode: parallel actions
			// wired sequentially. After Gmail runs, $json is the Gmail API
			// response (no `body` field), so $json.body.X is undefined.
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Send Auto-Reply',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						parameters: {
							sendTo: '={{ $json.body.email }}',
						},
					}),
					node({
						name: 'Notify Team',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						parameters: {
							operation: 'sendMessage',
							chatId: 'CHAT_ID',
							text: '={{ $json.body.message }}',
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Send Auto-Reply', type: 'main', index: 0 }]] },
					'Send Auto-Reply': { main: [[{ node: 'Notify Team', type: 'main', index: 0 }]] },
				},
			);
			const issues = checkSemanticIssues(wf);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'TRIGGER_JSON_REF_AFTER_NON_TRIGGER',
					nodeName: 'Notify Team',
				}),
			]);
			expect(issues[0].message).toContain("$('Webhook').item.json.body");
			expect(issues[0].message).toContain('Send Auto-Reply');
		});

		test('does NOT flag `$json.body.X` after an HTTP Request ancestor (its response legitimately has `body`)', () => {
			// Webhook -> HTTP Request -> Set reading $json.body.x : the HTTP
			// Request response shape is { statusCode, headers, body, ... }, so
			// `$json.body` is a valid reference, not a misplaced trigger payload.
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Fetch Profile',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						parameters: { url: 'https://api.example.com/profile' },
					}),
					node({
						name: 'Use Result',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						parameters: {
							fieldsToSet: { values: [{ name: 'email', stringValue: '={{ $json.body.email }}' }] },
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Fetch Profile', type: 'main', index: 0 }]] },
					'Fetch Profile': { main: [[{ node: 'Use Result', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('does NOT flag node immediately after a Webhook reading $json.body.X', () => {
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Send Auto-Reply',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						parameters: {
							sendTo: '={{ $json.body.email }}',
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Send Auto-Reply', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('walks through passthrough IF/Switch nodes between trigger and reader', () => {
			// Webhook -> IF -> Gmail: IF preserves $json so Gmail can safely
			// read $json.body.X. The check should NOT fire.
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Has Email',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Send Auto-Reply',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						parameters: {
							sendTo: '={{ $json.body.email }}',
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Has Email', type: 'main', index: 0 }]] },
					'Has Email': { main: [[{ node: 'Send Auto-Reply', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('flags Google Sheets autoMapInputData when immediate predecessor is a Webhook trigger', () => {
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Log to Sheets',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'append',
							columns: { mappingMode: 'autoMapInputData', value: {}, schema: [] },
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Log to Sheets', type: 'main', index: 0 }]] },
				},
			);
			const issues = checkSemanticIssues(wf);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'GOOGLE_SHEETS_AUTOMAP_AFTER_WEBHOOK',
					nodeName: 'Log to Sheets',
				}),
			]);
			expect(issues[0].message).toContain("$('Webhook').item.json.body");
		});

		test('does not flag Google Sheets autoMapInputData after a Form Trigger (form fields are top-level)', () => {
			const wf = workflow(
				[
					node({
						name: 'Form Trigger',
						type: 'n8n-nodes-base.formTrigger',
						typeVersion: 2.3,
						parameters: {},
					}),
					node({
						name: 'Log to Sheets',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'append',
							columns: { mappingMode: 'autoMapInputData', value: {}, schema: [] },
						},
					}),
				],
				{
					'Form Trigger': { main: [[{ node: 'Log to Sheets', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('flags Postgres autoMapInputData immediately after a Webhook (generic resource-mapper)', () => {
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
					}),
					node({
						name: 'Insert Submission',
						type: 'n8n-nodes-base.postgres',
						typeVersion: 2.5,
						parameters: {
							operation: 'insert',
							columns: { mappingMode: 'autoMapInputData', value: {}, schema: [] },
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Insert Submission', type: 'main', index: 0 }]] },
				},
			);
			const issues = checkSemanticIssues(wf);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'RESOURCE_MAPPER_AUTOMAP_AFTER_WEBHOOK',
					nodeName: 'Insert Submission',
				}),
			]);
		});

		test('does not flag Google Sheets defineBelow after a Webhook', () => {
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Log to Sheets',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'append',
							columns: {
								mappingMode: 'defineBelow',
								value: { name: "={{ $('Webhook').item.json.body.name }}" },
								schema: [],
							},
						},
					}),
				],
				{
					Webhook: { main: [[{ node: 'Log to Sheets', type: 'main', index: 0 }]] },
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});

		test('does not flag two parallel branches both directly off the Webhook trigger', () => {
			// Webhook -> Gmail (branch 1) and Webhook -> Telegram (branch 2):
			// both are immediate successors and may safely read $json.body.*
			const wf = workflow(
				[
					node({
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						parameters: {},
					}),
					node({
						name: 'Send Auto-Reply',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						parameters: { sendTo: '={{ $json.body.email }}' },
					}),
					node({
						name: 'Notify Team',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						parameters: {
							operation: 'sendMessage',
							chatId: 'CHAT_ID',
							text: '={{ $json.body.message }}',
						},
					}),
				],
				{
					Webhook: {
						main: [
							[
								{ node: 'Send Auto-Reply', type: 'main', index: 0 },
								{ node: 'Notify Team', type: 'main', index: 0 },
							],
						],
					},
				},
			);
			expect(checkSemanticIssues(wf)).toEqual([]);
		});
	});

	describe('resource-mapper matching column with volatile/dynamic value (generic)', () => {
		test('flags Google Sheets appendOrUpdate where Timestamp matching column is $now.toISO()', () => {
			const wf = workflow(
				[
					node({
						name: 'Log to Sheets',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'appendOrUpdate',
							columns: {
								mappingMode: 'defineBelow',
								value: {
									Email: '={{ $json.body.email }}',
									Timestamp: '={{ $now.toISO() }}',
								},
								schema: [],
								matchingColumns: ['Email', 'Timestamp'],
							},
						},
					}),
				],
				{},
			);
			const issues = checkSemanticIssues(wf);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
					nodeName: 'Log to Sheets',
				}),
			]);
			expect(issues[0].message).toContain("'Timestamp'");
			expect(issues[0].message).toContain('$now');
		});

		test('flags any resource-mapper-shaped node (e.g. Postgres) with Date.now() match key', () => {
			const wf = workflow(
				[
					node({
						name: 'Upsert Customer',
						type: 'n8n-nodes-base.postgres',
						typeVersion: 2.5,
						parameters: {
							operation: 'upsert',
							columns: {
								mappingMode: 'defineBelow',
								value: {
									customer_id: '={{ Date.now() }}',
									name: '={{ $json.name }}',
								},
								schema: [],
								matchingColumns: ['customer_id'],
							},
						},
					}),
				],
				{},
			);
			const issues = checkSemanticIssues(wf);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
					nodeName: 'Upsert Customer',
				}),
			]);
		});

		test('flags Math.random() / randomUUID() / $execution.id in matching values', () => {
			for (const expr of [
				'={{ Math.random() }}',
				'={{ crypto.randomUUID() }}',
				'={{ randomUUID() }}',
				'={{ uuid() }}',
				'={{ $execution.id }}',
				'={{ new Date().toISOString() }}',
				'={{ $itemIndex }}',
				'={{ $runIndex }}',
				'={{ $today.toFormat("yyyy-LL-dd") }}',
			]) {
				const wf = workflow(
					[
						node({
							name: 'Upsert Row',
							type: 'n8n-nodes-base.googleSheets',
							typeVersion: 4.7,
							parameters: {
								operation: 'appendOrUpdate',
								columns: {
									mappingMode: 'defineBelow',
									value: { Key: expr },
									schema: [],
									matchingColumns: ['Key'],
								},
							},
						}),
					],
					{},
				);
				const issues = checkSemanticIssues(wf).filter(
					(i) => i.code === 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
				);
				expect(issues).toHaveLength(1);
			}
		});

		test('does NOT flag `new Date($json.createdAt).toISOString()` — deterministic normalization', () => {
			// `new Date(input)` with a stable input is a common, valid match-key
			// transformation. Only the zero-arg form `new Date()` is volatile.
			const wf = workflow(
				[
					node({
						name: 'Upsert Customer',
						type: 'n8n-nodes-base.postgres',
						typeVersion: 2.5,
						parameters: {
							operation: 'upsert',
							columns: {
								mappingMode: 'defineBelow',
								value: {
									createdAt: "={{ new Date($('Webhook').item.json.body.createdAt).toISOString() }}",
									name: "={{ $('Webhook').item.json.body.name }}",
								},
								schema: [],
								matchingColumns: ['createdAt'],
							},
						},
					}),
				],
				{},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
				),
			).toEqual([]);
		});

		test('does NOT flag stable matching values from trigger / upstream payloads', () => {
			// Email-as-match-key referencing a stable webhook field is the canonical
			// upsert pattern — it must not be flagged.
			const wf = workflow(
				[
					node({
						name: 'Log to Sheets',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'appendOrUpdate',
							columns: {
								mappingMode: 'defineBelow',
								value: {
									Email: "={{ $('Webhook').item.json.body.email }}",
									Name: '={{ $json.body.name }}',
								},
								schema: [],
								matchingColumns: ['Email'],
							},
						},
					}),
				],
				{},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
				),
			).toEqual([]);
		});

		test('does NOT flag a volatile expression in a NON-matching column', () => {
			// $now.toISO() in a written-only column (Timestamp not in matchingColumns)
			// is legitimate — the row will be matched on Email and Timestamp updated.
			const wf = workflow(
				[
					node({
						name: 'Log to Sheets',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'appendOrUpdate',
							columns: {
								mappingMode: 'defineBelow',
								value: {
									Email: '={{ $json.body.email }}',
									Timestamp: '={{ $now.toISO() }}',
								},
								schema: [],
								matchingColumns: ['Email'],
							},
						},
					}),
				],
				{},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
				),
			).toEqual([]);
		});

		test('does NOT flag literal (non-expression) string values that contain the substring "$now"', () => {
			// A non-expression literal cannot evaluate at runtime; the check
			// requires a leading `=` so this is safe.
			const wf = workflow(
				[
					node({
						name: 'Log to Sheets',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'appendOrUpdate',
							columns: {
								mappingMode: 'defineBelow',
								value: { Key: 'Use $now to insert current time' },
								schema: [],
								matchingColumns: ['Key'],
							},
						},
					}),
				],
				{},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
				),
			).toEqual([]);
		});

		test('does NOT flag nodes that do not have the resource-mapper shape', () => {
			// Plain Set / Filter / Code nodes don't carry columns.matchingColumns.
			const wf = workflow(
				[
					node({
						name: 'Compute Timestamp',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						parameters: {
							assignments: {
								assignments: [{ name: 'ts', value: '={{ $now.toISO() }}' }],
							},
						},
					}),
				],
				{},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
				),
			).toEqual([]);
		});

		test('does NOT flag word-boundary near-misses (e.g. $nowt, $todayValue, Date.nowish)', () => {
			const wf = workflow(
				[
					node({
						name: 'Upsert Row',
						type: 'n8n-nodes-base.googleSheets',
						typeVersion: 4.7,
						parameters: {
							operation: 'appendOrUpdate',
							columns: {
								mappingMode: 'defineBelow',
								value: {
									Key: '={{ $json.$nowt }}',
									Key2: '={{ $json.$todayValue }}',
									Key3: '={{ $json.Date_nowish }}',
								},
								schema: [],
								matchingColumns: ['Key', 'Key2', 'Key3'],
							},
						},
					}),
				],
				{},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
				),
			).toEqual([]);
		});
	});

	describe('Merge node with parallel-branch action nodes lacking onError tolerance (generic)', () => {
		test('flags Webhook → (Gmail | Telegram | Sheets) → Merge where no action has onError', () => {
			const wf = workflow(
				[
					node({ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2 }),
					node({ name: 'Send Auto-Reply', type: 'n8n-nodes-base.gmail', typeVersion: 2.1 }),
					node({ name: 'Notify Team', type: 'n8n-nodes-base.telegram', typeVersion: 1.2 }),
					node({ name: 'Log to Sheets', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.7 }),
					node({ name: 'Combine Results', type: 'n8n-nodes-base.merge', typeVersion: 3 }),
				],
				{
					Webhook: {
						main: [
							[
								{ node: 'Send Auto-Reply', type: 'main', index: 0 },
								{ node: 'Notify Team', type: 'main', index: 0 },
								{ node: 'Log to Sheets', type: 'main', index: 0 },
							],
						],
					},
					'Send Auto-Reply': {
						main: [[{ node: 'Combine Results', type: 'main', index: 0 }]],
					},
					'Notify Team': {
						main: [[{ node: 'Combine Results', type: 'main', index: 1 }]],
					},
					'Log to Sheets': {
						main: [[{ node: 'Combine Results', type: 'main', index: 2 }]],
					},
				},
			);
			const issues = checkSemanticIssues(wf).filter(
				(i) => i.code === 'MERGE_PARALLEL_BRANCHES_NO_ERROR_TOLERANCE',
			);
			expect(issues).toHaveLength(1);
			expect(issues[0].nodeName).toBe('Combine Results');
		});

		test('does NOT flag when at least 2 of the parallel branches have onError tolerance', () => {
			// Only 1 branch (Sheets) without onError — not enough to flag.
			const wf = workflow(
				[
					node({ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2 }),
					node({
						name: 'Send Auto-Reply',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						onError: 'continueRegularOutput',
					}),
					node({
						name: 'Notify Team',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						onError: 'continueRegularOutput',
					}),
					node({ name: 'Log to Sheets', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.7 }),
					node({ name: 'Combine Results', type: 'n8n-nodes-base.merge', typeVersion: 3 }),
				],
				{
					Webhook: {
						main: [
							[
								{ node: 'Send Auto-Reply', type: 'main', index: 0 },
								{ node: 'Notify Team', type: 'main', index: 0 },
								{ node: 'Log to Sheets', type: 'main', index: 0 },
							],
						],
					},
					'Send Auto-Reply': {
						main: [[{ node: 'Combine Results', type: 'main', index: 0 }]],
					},
					'Notify Team': {
						main: [[{ node: 'Combine Results', type: 'main', index: 1 }]],
					},
					'Log to Sheets': {
						main: [[{ node: 'Combine Results', type: 'main', index: 2 }]],
					},
				},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'MERGE_PARALLEL_BRANCHES_NO_ERROR_TOLERANCE',
				),
			).toEqual([]);
		});

		test('does NOT flag when the Merge has only one input branch', () => {
			const wf = workflow(
				[
					node({ name: 'Manual', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1 }),
					node({ name: 'Send Email', type: 'n8n-nodes-base.gmail', typeVersion: 2.1 }),
					node({ name: 'Merge In', type: 'n8n-nodes-base.merge', typeVersion: 3 }),
				],
				{
					Manual: { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] },
					'Send Email': { main: [[{ node: 'Merge In', type: 'main', index: 0 }]] },
				},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'MERGE_PARALLEL_BRANCHES_NO_ERROR_TOLERANCE',
				),
			).toEqual([]);
		});

		test('does NOT flag a workflow without any Merge node', () => {
			const wf = workflow(
				[
					node({ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2 }),
					node({ name: 'Send Email', type: 'n8n-nodes-base.gmail', typeVersion: 2.1 }),
					node({ name: 'Notify Team', type: 'n8n-nodes-base.telegram', typeVersion: 1.2 }),
				],
				{
					Webhook: {
						main: [
							[
								{ node: 'Send Email', type: 'main', index: 0 },
								{ node: 'Notify Team', type: 'main', index: 0 },
							],
						],
					},
				},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'MERGE_PARALLEL_BRANCHES_NO_ERROR_TOLERANCE',
				),
			).toEqual([]);
		});

		test('does NOT flag when both Merge inputs are non-action shaping nodes (Set/Code)', () => {
			const wf = workflow(
				[
					node({ name: 'Manual', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1 }),
					node({ name: 'Shape A', type: 'n8n-nodes-base.set', typeVersion: 3.4 }),
					node({ name: 'Shape B', type: 'n8n-nodes-base.code', typeVersion: 2 }),
					node({ name: 'Merge In', type: 'n8n-nodes-base.merge', typeVersion: 3 }),
				],
				{
					Manual: {
						main: [
							[
								{ node: 'Shape A', type: 'main', index: 0 },
								{ node: 'Shape B', type: 'main', index: 0 },
							],
						],
					},
					'Shape A': { main: [[{ node: 'Merge In', type: 'main', index: 0 }]] },
					'Shape B': { main: [[{ node: 'Merge In', type: 'main', index: 1 }]] },
				},
			);
			expect(
				checkSemanticIssues(wf).filter(
					(i) => i.code === 'MERGE_PARALLEL_BRANCHES_NO_ERROR_TOLERANCE',
				),
			).toEqual([]);
		});

		test('flags branches with action nodes behind passthrough nodes (IF / Set / Code on the path)', () => {
			// Each branch has Set then an external action then → Merge.
			const wf = workflow(
				[
					node({ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2 }),
					node({ name: 'Flatten A', type: 'n8n-nodes-base.set', typeVersion: 3.4 }),
					node({ name: 'Flatten B', type: 'n8n-nodes-base.set', typeVersion: 3.4 }),
					node({ name: 'Send Email', type: 'n8n-nodes-base.gmail', typeVersion: 2.1 }),
					node({ name: 'Notify Team', type: 'n8n-nodes-base.telegram', typeVersion: 1.2 }),
					node({ name: 'Merge In', type: 'n8n-nodes-base.merge', typeVersion: 3 }),
				],
				{
					Webhook: {
						main: [
							[
								{ node: 'Flatten A', type: 'main', index: 0 },
								{ node: 'Flatten B', type: 'main', index: 0 },
							],
						],
					},
					'Flatten A': { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] },
					'Flatten B': { main: [[{ node: 'Notify Team', type: 'main', index: 0 }]] },
					'Send Email': { main: [[{ node: 'Merge In', type: 'main', index: 0 }]] },
					'Notify Team': { main: [[{ node: 'Merge In', type: 'main', index: 1 }]] },
				},
			);
			const issues = checkSemanticIssues(wf).filter(
				(i) => i.code === 'MERGE_PARALLEL_BRANCHES_NO_ERROR_TOLERANCE',
			);
			expect(issues).toHaveLength(1);
		});
	});
});
