/**
 * Unit tests for the LLM-as-judge grader.
 *
 * `eval-agents` is mocked: real Mastra agent calls are replaced with a
 * controllable stub that returns canned text. That keeps the grader's prompt
 * construction, truncation, timeout, and verdict parsing under test without
 * spending API quota.
 */

import { gradeTaskCompleted } from '../graders/llm';
import type {
	CapturedToolCall,
	LlmTaskCompletedGrader,
	ScenarioCategory,
	ScenarioTrace,
} from '../types';

// ---------------------------------------------------------------------------
// Mock surface
// ---------------------------------------------------------------------------

const generateMock = jest.fn();
const extractTextMock = jest.fn<string, [unknown]>();
let lastInstructions: string | undefined;

jest.mock('../../../src/utils/eval-agents', () => ({
	HAIKU_MODEL: 'anthropic/claude-haiku-4-5-20251001',
	createEvalAgent: jest.fn(
		(_name: string, opts: { instructions: string; model?: string; cache?: boolean }) => {
			lastInstructions = opts.instructions;
			return { generate: generateMock };
		},
	),
	extractText: (result: unknown) => extractTextMock(result),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trace(overrides: Partial<ScenarioTrace> = {}): ScenarioTrace {
	return {
		events: [],
		toolCalls: [],
		confirmations: [],
		finalText: '',
		durationMs: 0,
		tokens: { totalInput: 0, totalOutput: 0, byTool: [] },
		threadId: 'thread-1',
		...overrides,
	};
}

function call(toolName: string, args: Record<string, unknown> = {}): CapturedToolCall {
	return {
		toolCallId: `id-${toolName}-${Math.random().toString(36).slice(2, 8)}`,
		toolName,
		args,
		durationMs: 0,
	};
}

const grader: LlmTaskCompletedGrader = { type: 'llm.taskCompleted' };
const userPrompt = 'Set up a Slack OAuth credential';
const category: ScenarioCategory = 'credential-setup';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	generateMock.mockReset();
	extractTextMock.mockReset();
	lastInstructions = undefined;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('llm.taskCompleted', () => {
	describe('verdict parsing', () => {
		it('passes when the judge returns a PASS verdict', async () => {
			generateMock.mockResolvedValue({});
			extractTextMock.mockReturnValue(
				'Reasoning: The agent surfaced the credential values and paused for user copy.\n```json\n{"pass": true, "reasoning": "values surfaced as expected"}\n```',
			);

			const result = await gradeTaskCompleted(
				trace({ finalText: 'OAuth credentials are visible.' }),
				userPrompt,
				category,
				grader,
			);

			expect(result.pass).toBe(true);
			expect(result.reason).toContain('values surfaced');
		});

		it('fails when the judge returns a FAIL verdict', async () => {
			generateMock.mockResolvedValue({});
			extractTextMock.mockReturnValue(
				'```json\n{"pass": false, "reasoning": "agent gave up before reaching the values"}\n```',
			);

			const result = await gradeTaskCompleted(trace(), userPrompt, category, grader);

			expect(result.pass).toBe(false);
			expect(result.reason).toContain('gave up');
		});

		it('fails with the raw text when the verdict is unparseable', async () => {
			generateMock.mockResolvedValue({});
			extractTextMock.mockReturnValue('totally not json or markdown verdict text');

			const result = await gradeTaskCompleted(trace(), userPrompt, category, grader);

			expect(result.pass).toBe(false);
			expect(result.reason).toMatch(/unparseable verdict/i);
			expect(result.reason).toContain('totally not json');
		});
	});

	describe('prompt construction', () => {
		function captureUserMessage(): string {
			expect(generateMock).toHaveBeenCalledTimes(1);
			const [userMessage] = generateMock.mock.calls[0] as [string];
			return userMessage;
		}

		beforeEach(() => {
			generateMock.mockResolvedValue({});
			extractTextMock.mockReturnValue('```json\n{"pass": true, "reasoning": "ok"}\n```');
		});

		it('includes the scenario category, user prompt, and final text', async () => {
			await gradeTaskCompleted(
				trace({ finalText: 'Final response from the agent.' }),
				userPrompt,
				category,
				grader,
			);

			const sent = captureUserMessage();
			expect(sent).toContain('credential-setup');
			expect(sent).toContain('Set up a Slack OAuth credential');
			expect(sent).toContain('Final response from the agent.');
		});

		it('injects scenario-specific criteria when provided', async () => {
			await gradeTaskCompleted(trace(), userPrompt, category, {
				...grader,
				criteria: 'Must surface the Client ID',
			});

			expect(captureUserMessage()).toContain('Must surface the Client ID');
		});

		it('truncates finalText to 8 000 chars', async () => {
			const huge = 'a'.repeat(20_000);
			await gradeTaskCompleted(trace({ finalText: huge }), userPrompt, category, grader);

			const sent = captureUserMessage();
			// 8 000 chars of "a" should be present, anything past that should not.
			expect(sent).toContain('a'.repeat(8_000));
			expect(sent).not.toContain('a'.repeat(8_001));
		});

		it('summarises tool calls with a (… N more) footer when there are more than 50', async () => {
			const calls: CapturedToolCall[] = Array.from(
				{ length: 60 },
				(_, i): CapturedToolCall => call(`tool_${String(i)}`),
			);
			await gradeTaskCompleted(trace({ toolCalls: calls }), userPrompt, category, grader);

			const sent = captureUserMessage();
			expect(sent).toContain('1. tool_0');
			expect(sent).toContain('50. tool_49');
			expect(sent).not.toContain('51. tool_50');
			expect(sent).toContain('10 more tool call(s) omitted');
		});

		it('shows "(none)" when there are no tool calls', async () => {
			await gradeTaskCompleted(trace(), userPrompt, category, grader);
			expect(captureUserMessage()).toContain('(none)');
		});

		it('passes the system instructions through to createEvalAgent', async () => {
			await gradeTaskCompleted(trace(), userPrompt, category, grader);
			expect(lastInstructions).toBeDefined();
			expect(lastInstructions).toMatch(/strict evaluator/i);
		});

		it('treats placeholder-like tokens inside user content as literal text', async () => {
			const promptWithTokens =
				'Set up a credential and explain {toolCallSummary} and {criteria} to me';
			await gradeTaskCompleted(
				trace({ toolCalls: [call('shell_exec', { cmd: 'ls' })] }),
				promptWithTokens,
				category,
				grader,
			);

			const sent = captureUserMessage();
			expect(sent).toContain(promptWithTokens);
			expect(sent).toContain('1. shell_exec');
		});
	});

	describe('failure modes', () => {
		it('returns a failed result when generate() throws', async () => {
			generateMock.mockRejectedValue(new Error('upstream rate-limited'));

			const result = await gradeTaskCompleted(trace(), userPrompt, category, grader);

			expect(result.pass).toBe(false);
			expect(result.reason).toContain('upstream rate-limited');
		});

		it('honors timeoutMs and returns a failed result with a timeout error', async () => {
			generateMock.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(resolve, 1_000)),
			);

			const result = await gradeTaskCompleted(trace(), userPrompt, category, {
				...grader,
				timeoutMs: 10,
			});

			expect(result.pass).toBe(false);
			expect(result.reason).toMatch(/timed out/i);
		});
	});
});
