import { confirm, isCancel, text, select } from '@clack/prompts';

interface PromptConfig {
	message: string;
	placeholder?: string;
	defaultValue?: string;
	options?: Array<{ label: string; value: unknown; hint?: string }>;
}

type PromptAnswer<T = unknown> = T | 'CANCEL';

interface QuestionAnswerPair<T = unknown> {
	question: string | Partial<PromptConfig>;
	answer: PromptAnswer<T>;
}

export class MockPrompt {
	private static readonly questionAnswers = new Map<string, PromptAnswer>();
	private static readonly askedQuestions = new Set<string>();

	static setup(pairs: QuestionAnswerPair[]): void {
		MockPrompt.reset();

		for (const { question, answer } of pairs) {
			const key = typeof question === 'string' ? question : question.message!;
			MockPrompt.questionAnswers.set(key, answer);
		}

		MockPrompt.setupMocks();
	}

	static reset(): void {
		vi.mocked(confirm).mockReset();
		vi.mocked(text).mockReset();
		vi.mocked(select).mockReset();
		vi.mocked(isCancel).mockReset();
		MockPrompt.questionAnswers.clear();
		MockPrompt.askedQuestions.clear();
	}

	static getAskedQuestions(): string[] {
		return Array.from(MockPrompt.askedQuestions);
	}

	private static setupMocks(): void {
		vi.mocked(select).mockImplementation(async (config) => {
			MockPrompt.askedQuestions.add(config.message);
			const answer = MockPrompt.questionAnswers.get(config.message);
			if (answer === undefined) {
				throw new Error(`No mock answer configured for select question: "${config.message}"`);
			}
			if (answer === 'CANCEL') {
				return await Promise.resolve(Symbol('cancel'));
			}
			return answer;
		});

		vi.mocked(text).mockImplementation(async (config) => {
			MockPrompt.askedQuestions.add(config.message);
			const answer = MockPrompt.questionAnswers.get(config.message);
			if (answer === undefined) {
				throw new Error(`No mock answer configured for text question: "${config.message}"`);
			}
			if (answer === 'CANCEL') {
				return await Promise.resolve(Symbol('cancel'));
			}
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			return String(answer);
		});

		vi.mocked(confirm).mockImplementation(async (config) => {
			MockPrompt.askedQuestions.add(config.message);
			const answer = MockPrompt.questionAnswers.get(config.message);
			if (answer === undefined) {
				throw new Error(`No mock answer configured for confirm question: "${config.message}"`);
			}
			if (answer === 'CANCEL') {
				return await Promise.resolve(Symbol('cancel'));
			}
			return Boolean(answer);
		});

		vi.mocked(isCancel).mockImplementation((value) => {
			return typeof value === 'symbol' && value.description === 'cancel';
		});
	}
}
