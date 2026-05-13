declare module 'prompts' {
	type PromptQuestion = {
		type: string;
		name: string;
		message?: string;
		choices?: Array<{ title: string; value: string }>;
		initial?: string;
	};

	type PromptOptions = {
		onCancel?: () => boolean;
	};

	const prompts: (question: unknown, options?: PromptOptions) => Promise<unknown>;

	export default prompts;
}
