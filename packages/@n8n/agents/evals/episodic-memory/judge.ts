import { parseJudgeScores } from './scoring';
import type {
	EpisodicEvalEntry,
	EpisodicEvalFinalAnswer,
	EpisodicEvalRecallResult,
	EpisodicJudgeScores,
	EpisodicMemoryScenario,
} from './types';
import { Agent } from '../../src/sdk/agent';
import { filterLlmMessages } from '../../src/sdk/message';
import type { AgentMessage } from '../../src/types/sdk/message';

export interface JudgeScenarioInput {
	model: string;
	scenario: EpisodicMemoryScenario;
	entries: EpisodicEvalEntry[];
	recalls: EpisodicEvalRecallResult[];
	finalAnswers: EpisodicEvalFinalAnswer[];
}

export async function judgeScenario(input: JudgeScenarioInput): Promise<EpisodicJudgeScores> {
	const agent = new Agent('episodic-memory-eval-judge')
		.model(input.model)
		.instructions('You are an evaluation judge. Respond only with strict JSON.');
	try {
		const result = await agent.generate(buildJudgePrompt(input));
		return parseJudgeScores(extractText(result.messages));
	} finally {
		await agent.close();
	}
}

function buildJudgePrompt(input: JudgeScenarioInput): string {
	return [
		'Evaluate the episodic memory scenario below.',
		'Return ONLY strict JSON with keys answerCorrectness, answerFaithfulness, historicalFraming, inventoryCompleteness, distractorResistance, and notes.',
		'Each score must be an integer from 0 to 5. notes must be an array of short strings.',
		'',
		'Rubric:',
		'- answerCorrectness: final answers include the expected historical facts.',
		'- answerFaithfulness: answer claims are supported by recalled entries or active memory.',
		'- historicalFraming: answers frame recalled memory as prior/historical context, not current-thread truth.',
		'- inventoryCompleteness: exact artifacts, names, IDs, and decisions are complete.',
		'- distractorResistance: stale, forbidden, or unrelated facts are not used.',
		'',
		`Scenario: ${input.scenario.name}`,
		`Expected active facts: ${JSON.stringify(input.scenario.expectedActiveEpisodes)}`,
		`Stale facts: ${JSON.stringify(input.scenario.staleFacts)}`,
		`Forbidden facts: ${JSON.stringify(input.scenario.forbiddenFacts)}`,
		`Exact identifiers: ${JSON.stringify(input.scenario.exactIdentifiers)}`,
		`Active entries: ${JSON.stringify(input.entries.filter((entry) => entry.status === 'active'))}`,
		`Recall results: ${JSON.stringify(input.recalls)}`,
		`Final answers: ${JSON.stringify(input.finalAnswers)}`,
	].join('\n');
}

function extractText(messages: AgentMessage[]): string {
	return filterLlmMessages(messages)
		.flatMap((message) => message.content)
		.flatMap((content) => (content.type === 'text' ? [content.text] : []))
		.join('');
}
