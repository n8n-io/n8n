/* eslint-disable complexity */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { MemorySaver } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	setupIntegrationLLM,
	shouldRunIntegrationTests,
} from '@/chains/test/integration/test-helpers';
import { DiscoverySubgraph } from '@/subgraphs/discovery.subgraph';

import { loadNodesFromFile } from '../../../../evaluations/support/load-nodes';

/**
 * Integration tests for QUALITY of clarifying questions in discovery.
 *
 * Tests whether the discovery agent:
 * - Asks questions for ambiguous prompts
 * - Skips questions for specific prompts
 * - Asks relevant, outcome-focused questions (not technical jargon)
 * - Stays within 2-3 questions
 * - Provides options grounded in n8n capabilities
 *
 * To run:
 * ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm jest question-quality.integration
 */

const skipTests = !shouldRunIntegrationTests();

let threadCounter = 0;
function nextThreadId() {
	return `question-quality-${Date.now()}-${++threadCounter}`;
}

// ---------------------------------------------------------------------------
// Test prompts
// ---------------------------------------------------------------------------

interface QuestionTestCase {
	name: string;
	prompt: string;
	/** Whether we expect the agent to ask clarifying questions */
	expectQuestions: boolean;
	/**
	 * Keywords that should appear in at least one question text.
	 * Only checked when expectQuestions=true and questions are actually asked.
	 */
	relevantKeywords?: string[];
}

// ── SHOULD ASK: genuinely ambiguous, could mean 3+ different workflows ──
//
// relevantKeywords: domain-specific terms that MUST appear in questions or options
// to prove the agent understood the topic. No generic filler like "what/which/how".
const shouldAskPrompts: QuestionTestCase[] = [
	{
		name: 'Ambiguous: "do something with emails"',
		prompt: 'Do something with my emails',
		expectQuestions: true,
		relevantKeywords: ['email', 'gmail', 'outlook'],
	},
	{
		name: 'Ambiguous: notifications, no channel or trigger',
		prompt: 'Set up notifications for my team',
		expectQuestions: true,
		relevantKeywords: ['slack', 'email', 'telegram', 'notification'],
	},
	{
		name: 'Ambiguous: "automate my CRM" — which CRM? what action?',
		prompt: 'Automate my CRM',
		expectQuestions: true,
		relevantKeywords: ['salesforce', 'hubspot', 'pipedrive', 'crm', 'lead', 'contact'],
	},
	{
		name: 'Ambiguous: data sync with no services named',
		prompt: 'Sync my data between services',
		expectQuestions: true,
		relevantKeywords: ['sync', 'service'],
	},
	{
		name: 'Ambiguous: "build a chatbot" — for what? where?',
		prompt: 'Build a chatbot',
		expectQuestions: true,
		relevantKeywords: ['slack', 'telegram', 'chat', 'knowledge', 'ai'],
	},
];

// ── SHOULD NOT ASK: clear intent, reasonable defaults, one obvious workflow ──
const shouldNotAskPrompts: QuestionTestCase[] = [
	{
		name: 'Clear: website monitoring with defaults',
		prompt: 'Monitor my website for downtime and alert me',
		expectQuestions: false,
	},
	{
		name: 'Clear: weather check and store',
		prompt: 'Check weather every hour and store the data',
		expectQuestions: false,
	},
	{
		name: 'Clear: Slack + Gmail with specific trigger',
		prompt: 'Send a Slack message when I get a Gmail with an invoice attachment',
		expectQuestions: false,
	},
	{
		name: 'Clear: RSS digest with all details',
		prompt:
			'Every Monday at 8am, collect new RSS items from TechCrunch and send me a digest via Gmail',
		expectQuestions: false,
	},
	{
		name: 'Clear: webhook to database',
		prompt: 'Receive webhook POST data and insert it into a PostgreSQL table',
		expectQuestions: false,
	},
];

// ── GREY ZONE: intent is clear-ish but missing a key detail ──
// These test real judgment. Either answer is acceptable — what matters is
// that IF questions are asked, they're relevant, and if skipped, the agent
// made reasonable defaults.
const greyZonePrompts: QuestionTestCase[] = [
	{
		name: 'Grey: lead scoring — clear domain, vague mechanics',
		prompt: 'Create a lead scoring workflow',
		expectQuestions: true, // which CRM? what criteria?
		relevantKeywords: ['lead', 'score', 'crm', 'hubspot', 'salesforce', 'form'],
	},
	{
		name: 'Grey: competitor pricing — clear goal, missing target',
		prompt: 'Scrape competitor pricing daily and track changes',
		expectQuestions: true, // which competitors/sites? where to store?
		relevantKeywords: ['competitor', 'site', 'url', 'price', 'store', 'sheet'],
	},
	{
		name: 'Grey: approval workflow — clear pattern, vague scope',
		prompt: 'Set up an approval workflow for expense reports',
		expectQuestions: true, // approve via what? who approves?
		relevantKeywords: ['expense', 'approval', 'approve', 'slack', 'email', 'form'],
	},
	{
		name: 'Grey: contact form to newsletter — almost specific',
		prompt: 'When someone fills out my contact form, add them to my newsletter',
		expectQuestions: true, // which form tool? which newsletter service?
		relevantKeywords: ['newsletter', 'mailchimp', 'sendgrid', 'brevo', 'form'],
	},
	{
		name: 'Grey: daily Slack summary — clear but missing scope',
		prompt: 'Send me a daily summary of my Slack messages',
		expectQuestions: true, // which channels? what kind of summary?
		relevantKeywords: ['slack', 'channel', 'summary', 'message'],
	},
	{
		name: 'Grey: onboarding automation — domain clear, steps vague',
		prompt: 'Automate new employee onboarding',
		expectQuestions: true, // which systems? what steps?
		relevantKeywords: ['onboard', 'employee', 'welcome', 'account', 'slack', 'email'],
	},
	{
		name: 'Grey: invoice processing — clear task, vague source',
		prompt: 'Automatically process invoices and update accounting',
		expectQuestions: true, // invoices from where? which accounting tool?
		relevantKeywords: ['invoice', 'accounting', 'quickbooks', 'xero', 'gmail', 'extract'],
	},
	{
		name: 'Grey: social listening — clear category, multiple approaches',
		prompt: 'Track mentions of my brand across the internet',
		expectQuestions: true, // which platforms? what action on mention?
		relevantKeywords: ['brand', 'mention', 'social', 'monitor', 'alert', 'twitter'],
	},
	{
		name: 'Grey: backup workflow — clear need, vague target',
		prompt: 'Back up my important data regularly',
		expectQuestions: true, // what data? from where? to where?
		relevantKeywords: ['backup', 'google drive', 'dropbox', 's3', 'sheet', 'database'],
	},
	{
		name: 'Grey: AI content — clear use of AI, unclear specifics',
		prompt: 'Use AI to help with my content creation',
		expectQuestions: true, // what content? blog? social? what AI task?
		relevantKeywords: ['content', 'blog', 'social', 'article', 'post', 'ai'],
	},
];

const allTestCases = [...shouldAskPrompts, ...shouldNotAskPrompts, ...greyZonePrompts];

// ---------------------------------------------------------------------------
// Quality checks
// ---------------------------------------------------------------------------

interface QuestionData {
	id: string;
	question: string;
	type: string;
	options?: string[];
}

interface TestResult {
	name: string;
	prompt: string;
	expectQuestions: boolean;
	gotQuestions: boolean;
	questions: QuestionData[];
	introMessage?: string;
	relevantKeywords?: string[];
	keywordHits: string[];
	violations: string[];
}

function checkQuestionQuality(
	_testCase: QuestionTestCase,
	questions: QuestionData[],
	_introMessage?: string,
): string[] {
	const violations: string[] = [];

	// Max 5 questions (tool schema limit), but good practice is 2-3
	if (questions.length > 5) {
		violations.push(`Too many questions: ${questions.length} (max 5)`);
	}

	for (const q of questions) {
		const text = q.question.toLowerCase();

		// Questions should not use internal n8n terminology
		if (text.includes('node type') || text.includes('n8n-nodes-base')) {
			violations.push(`Technical jargon in question: "${q.question}"`);
		}

		// Questions should not ask about implementation details
		const implementationPatterns = [
			'which trigger type',
			'what format should',
			'do you want error handling',
			'what mode',
			'which version',
			'connection type',
			'parameter',
		];
		for (const pattern of implementationPatterns) {
			if (text.includes(pattern)) {
				violations.push(
					`Implementation detail in question: "${q.question}" (matched: "${pattern}")`,
				);
			}
		}

		// Single/multi-select should have options
		if ((q.type === 'single' || q.type === 'multi') && (!q.options || q.options.length === 0)) {
			violations.push(`${q.type}-select question has no options: "${q.question}"`);
		}

		// Options should be understandable by non-technical users
		if (q.options) {
			for (const opt of q.options) {
				const optLower = opt.toLowerCase();
				if (optLower.includes('n8n-nodes-base') || optLower.includes('@n8n/')) {
					violations.push(`Internal node name in option: "${opt}" for question "${q.question}"`);
				}
			}

			// "Other" options should not be included — the UI adds them automatically.
			// Catches "Other", "Other source", "Other service", etc.
			const hasOtherOption = q.options.some((opt) => opt.toLowerCase().trim().startsWith('other'));
			if (hasOtherOption) {
				violations.push(
					`"Other" option should not be included (UI adds it automatically): question "${q.question}"`,
				);
			}
		}

		// Options should not name obscure tools without describing what they do.
		// Well-known services (Gmail, Slack, Airtable, etc.) are fine.
		const obscureToolNames = ['mindee', 'textract', 'serpapi', 'qdrant', 'pinecone', 'weaviate'];
		if (q.options) {
			for (const opt of q.options) {
				const optLower = opt.toLowerCase();
				for (const toolName of obscureToolNames) {
					if (optLower.includes(toolName)) {
						// Only flag if the option just names the tool without a plain description
						// e.g. "Mindee (specialized for invoices)" is bad, but
						// "Specialized invoice reader" is fine
						const hasDescription =
							opt.includes('extract') ||
							opt.includes('reader') ||
							opt.includes('powered') ||
							opt.includes('specialized');
						if (!hasDescription) {
							violations.push(
								`Obscure tool name "${toolName}" in option without plain description: "${opt}"`,
							);
						}
					}
				}
			}
		}

		// Questions shouldn't be too short (likely not helpful) or too long (confusing)
		if (q.question.length < 10) {
			violations.push(`Question too short: "${q.question}"`);
		}
		if (q.question.length > 300) {
			violations.push(
				`Question too long (${q.question.length} chars): "${q.question.slice(0, 50)}..."`,
			);
		}
	}

	return violations;
}

function findKeywordHits(questions: QuestionData[], keywords?: string[]): string[] {
	if (!keywords?.length) return [];
	// Search question text AND options — options are where domain terms actually appear
	const allText = questions
		.flatMap((q) => [q.question, ...(q.options ?? [])])
		.join(' ')
		.toLowerCase();
	return keywords.filter((kw) => allText.includes(kw.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Question Quality - Integration Tests', () => {
	let llm: BaseChatModel;
	let parsedNodeTypes: INodeTypeDescription[];
	let discoverySubgraph: DiscoverySubgraph;

	jest.setTimeout(600_000); // 10 minutes for the full suite

	beforeAll(async () => {
		jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
			process.stdout.write(args.map(String).join(' ') + '\n');
		});

		if (skipTests) {
			console.log(
				'\n⏭️  Skipping question quality tests. Set ENABLE_INTEGRATION_TESTS=true to run.\n',
			);
			return;
		}

		console.log('\n🚀 Setting up question quality integration test environment...\n');

		llm = await setupIntegrationLLM();
		parsedNodeTypes = loadNodesFromFile();
		discoverySubgraph = new DiscoverySubgraph();

		console.log(`Loaded ${parsedNodeTypes.length} node types\n`);
	});

	function createGraph() {
		return discoverySubgraph.create({
			parsedNodeTypes,
			llm,
			plannerLLM: llm,
			featureFlags: { planMode: true },
			checkpointer: new MemorySaver(),
		});
	}

	it('should ask relevant questions for ambiguous prompts and skip questions for specific ones', async () => {
		if (skipTests) return;

		console.log(`\n📊 Running question quality suite (${allTestCases.length} prompts)...\n`);
		console.log('─'.repeat(80));

		const results: TestResult[] = [];

		for (const testCase of allTestCases) {
			const graph = createGraph();
			const threadId = nextThreadId();

			const config = { configurable: { thread_id: threadId } };
			const input = {
				userRequest: testCase.prompt,
				workflowJSON: { nodes: [], connections: {}, name: '' },
				mode: 'plan' as const,
				planOutput: null,
				planFeedback: null,
				planPrevious: null,
			};

			await graph.invoke(input, config);
			const state = await graph.getState(config);
			const interruptData = state.tasks?.[0]?.interrupts?.[0];
			const interruptValue = interruptData?.value as
				| { type: string; questions?: QuestionData[]; introMessage?: string }
				| undefined;

			const gotQuestions = interruptValue?.type === 'questions';
			const questions = (gotQuestions ? interruptValue?.questions : []) as QuestionData[];
			const introMessage = gotQuestions ? interruptValue?.introMessage : undefined;

			const violations = gotQuestions
				? checkQuestionQuality(testCase, questions, introMessage)
				: [];
			const keywordHits = findKeywordHits(questions, testCase.relevantKeywords);

			results.push({
				name: testCase.name,
				prompt: testCase.prompt,
				expectQuestions: testCase.expectQuestions,
				gotQuestions,
				questions,
				introMessage,
				relevantKeywords: testCase.relevantKeywords,
				keywordHits,
				violations,
			});

			// Log each result
			const expectIcon = testCase.expectQuestions ? '❓' : '🔨';
			const matchIcon =
				testCase.expectQuestions === gotQuestions
					? '✅'
					: testCase.expectQuestions
						? '⚠️  NO QUESTIONS'
						: '⚠️  UNEXPECTED QUESTIONS';

			console.log(`${expectIcon} ${testCase.name}: ${matchIcon}`);
			console.log(`   Prompt: "${testCase.prompt}"`);

			if (gotQuestions) {
				console.log(`   Questions (${questions.length}):`);
				for (const q of questions) {
					const opts = q.options?.length ? ` [${q.options.join(', ')}]` : '';
					console.log(`     - (${q.type}) ${q.question}${opts}`);
				}
				if (introMessage) {
					console.log(`   Intro: "${introMessage}"`);
				}
				if (violations.length > 0) {
					console.log(`   ❌ Violations: ${violations.join('; ')}`);
				}
			} else {
				const interruptType = interruptValue?.type ?? 'none';
				console.log(`   → Skipped questions (interrupt: ${interruptType})`);
			}
			console.log('');
		}

		// ── Statistics ──────────────────────────────────────────────────────
		console.log('═'.repeat(80));
		console.log('📈 RESULTS\n');

		// Split results by category using the original arrays
		const shouldAskNames = new Set(shouldAskPrompts.map((p) => p.name));
		const shouldNotAskNames = new Set(shouldNotAskPrompts.map((p) => p.name));
		const greyZoneNames = new Set(greyZonePrompts.map((p) => p.name));

		const shouldAskResults = results.filter((r) => shouldAskNames.has(r.name));
		const shouldNotAskResults = results.filter((r) => shouldNotAskNames.has(r.name));
		const greyZoneResults = results.filter((r) => greyZoneNames.has(r.name));

		const shouldAskAsked = shouldAskResults.filter((r) => r.gotQuestions).length;
		const shouldNotAskSkipped = shouldNotAskResults.filter((r) => !r.gotQuestions).length;
		const greyZoneAsked = greyZoneResults.filter((r) => r.gotQuestions).length;

		const shouldAskRate = (shouldAskAsked / shouldAskResults.length) * 100;
		const shouldNotAskRate = (shouldNotAskSkipped / shouldNotAskResults.length) * 100;
		const greyZoneRate = (greyZoneAsked / greyZoneResults.length) * 100;

		console.log('SHOULD ASK (obviously ambiguous):');
		console.log(
			`  Asked questions: ${shouldAskAsked}/${shouldAskResults.length} (${shouldAskRate.toFixed(0)}%)`,
		);

		console.log('SHOULD NOT ASK (obviously specific):');
		console.log(
			`  Skipped questions: ${shouldNotAskSkipped}/${shouldNotAskResults.length} (${shouldNotAskRate.toFixed(0)}%)`,
		);

		console.log('GREY ZONE (debatable — tests real judgment):');
		console.log(
			`  Asked questions: ${greyZoneAsked}/${greyZoneResults.length} (${greyZoneRate.toFixed(0)}%)`,
		);

		// Question count stats
		const allQuestionCounts = results.filter((r) => r.gotQuestions).map((r) => r.questions.length);
		if (allQuestionCounts.length > 0) {
			const avg = allQuestionCounts.reduce((a, b) => a + b, 0) / allQuestionCounts.length;
			const max = Math.max(...allQuestionCounts);
			console.log(`\nQuestion count: avg=${avg.toFixed(1)}, max=${max}`);
		}

		// Keyword relevance (only for prompts that asked questions and have keywords)
		const withKeywords = results.filter((r) => r.gotQuestions && r.relevantKeywords?.length);
		const keywordHitRate =
			withKeywords.length > 0
				? (withKeywords.filter((r) => r.keywordHits.length > 0).length / withKeywords.length) * 100
				: 0;
		console.log(
			`\nKeyword relevance: ${keywordHitRate.toFixed(0)}% hit at least one domain keyword`,
		);

		// Show per-prompt keyword detail
		for (const r of withKeywords) {
			const missed = (r.relevantKeywords ?? []).filter((kw) => !r.keywordHits.includes(kw));
			const hitStr = r.keywordHits.length > 0 ? r.keywordHits.join(', ') : '(none)';
			const missStr = missed.length > 0 ? ` missed: ${missed.join(', ')}` : '';
			console.log(`  ${r.name}: hits=[${hitStr}]${missStr}`);
		}

		// Violations
		const allViolations = results.flatMap((r) => r.violations);
		if (allViolations.length > 0) {
			console.log(`\n❌ Quality violations (${allViolations.length}):`);
			for (const v of allViolations) {
				console.log(`   - ${v}`);
			}
		} else {
			console.log('\n✅ No quality violations');
		}

		// Mismatches for the non-grey-zone prompts
		const hardMismatches = [...shouldAskResults, ...shouldNotAskResults].filter(
			(r) => r.expectQuestions !== r.gotQuestions,
		);
		if (hardMismatches.length > 0) {
			console.log(`\n⚠️  Hard mismatches (${hardMismatches.length}):`);
			for (const m of hardMismatches) {
				const expected = m.expectQuestions ? 'expected questions' : 'expected skip';
				const got = m.gotQuestions ? 'got questions' : 'skipped';
				console.log(`   - "${m.name}": ${expected}, ${got}`);
			}
		}

		// Grey zone detail
		console.log('\n📋 Grey zone detail:');
		for (const r of greyZoneResults) {
			const icon = r.gotQuestions ? '❓' : '🔨';
			console.log(
				`  ${icon} ${r.name}: ${r.gotQuestions ? `asked ${r.questions.length}q` : 'skipped'}`,
			);
		}

		console.log('\n' + '═'.repeat(80) + '\n');

		// ── Assertions ──────────────────────────────────────────────────────

		// Obviously ambiguous: must ask questions (high bar)
		expect(shouldAskRate).toBeGreaterThanOrEqual(80);

		// Obviously specific: must skip questions (high bar)
		expect(shouldNotAskRate).toBeGreaterThanOrEqual(80);

		// Grey zone: no hard assertion on rate — these are genuinely debatable.
		// We just log results for human review. But IF questions are asked,
		// they must be quality (no violations).

		// Schema limit: max 5 questions per interrupt
		for (const r of results) {
			expect(r.questions.length).toBeLessThanOrEqual(5);
		}

		// No quality violations (technical jargon, implementation details, etc.)
		expect(allViolations).toHaveLength(0);
	});

	// ── Storage questions: n8n Data Tables should be the recommended option ──

	const storagePrompts = [
		{
			name: 'Storage: track data over time',
			prompt: 'Every hour check my website uptime and store the results',
		},
		{
			name: 'Storage: save form submissions',
			prompt: 'Collect form submissions and save them to a database',
		},
		{
			name: 'Storage: log processed invoices',
			prompt: 'Automatically process invoices and update accounting',
		},
	];

	it.each(storagePrompts)(
		'should recommend n8n Data Tables for storage: $name',
		async ({ name, prompt: userPrompt }) => {
			if (skipTests) return;

			const graph = createGraph();
			const threadId = nextThreadId();
			const config = { configurable: { thread_id: threadId } };

			const input = {
				userRequest: userPrompt,
				workflowJSON: { nodes: [], connections: {}, name: '' },
				mode: 'plan' as const,
				planOutput: null,
				planFeedback: null,
				planPrevious: null,
			};

			await graph.invoke(input, config);
			const state = await graph.getState(config);
			const interruptData = state.tasks?.[0]?.interrupts?.[0];
			const interruptValue = interruptData?.value as
				| { type: string; questions?: QuestionData[]; introMessage?: string }
				| undefined;

			const gotQuestions = interruptValue?.type === 'questions';

			if (!gotQuestions) {
				// Agent didn't ask questions — it should have picked data tables by default.
				// This is acceptable; the prompt guidance tells it to default to data tables.
				console.log(`  ${name}: No questions asked (agent chose defaults) ✅`);
				return;
			}

			const questions = interruptValue?.questions ?? [];

			// Find any storage-related question (mentions store, save, database, table, sheet)
			const storageKeywords = [
				'store',
				'save',
				'database',
				'table',
				'sheet',
				'storage',
				'record',
				'track',
				'log',
			];
			const storageQuestion = questions.find((q) => {
				const text = q.question.toLowerCase();
				const optionsText = (q.options ?? []).join(' ').toLowerCase();
				const allText = `${text} ${optionsText}`;
				return storageKeywords.some((kw) => allText.includes(kw));
			});

			if (!storageQuestion) {
				// No storage question found — agent may have defaulted to data tables.
				console.log(`  ${name}: No storage question found (agent may have defaulted) ✅`);
				return;
			}

			console.log(`  ${name}: Storage question: "${storageQuestion.question}"`);
			console.log(`    Options: [${(storageQuestion.options ?? []).join(', ')}]`);

			// n8n Data Tables should be among the options
			const options = storageQuestion.options ?? [];
			const hasDataTableOption = options.some(
				(opt) => opt.toLowerCase().includes('data table') || opt.toLowerCase().includes('built-in'),
			);

			expect(hasDataTableOption).toBe(true);

			// n8n Data Tables should be the FIRST option (recommended)
			if (options.length > 0) {
				const firstOption = options[0].toLowerCase();
				const isFirstOption =
					firstOption.includes('data table') || firstOption.includes('built-in');
				if (!isFirstOption) {
					console.log(`  ⚠️  Data Tables not first option. First: "${options[0]}"`);
				}
				expect(isFirstOption).toBe(true);
			}
		},
	);
});
