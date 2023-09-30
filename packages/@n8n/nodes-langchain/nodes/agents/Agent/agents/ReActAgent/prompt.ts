export const PREFIX =
	'Answer the following questions as best you can. You have access to the following tools:';

export const SUFFIX_CHAT =
	'Begin! Reminder to always use the exact characters `Final Answer` when responding.';

export const SUFFIX = `Begin!

	Question: {input}
	Thought:{agent_scratchpad}`;

export const HUMAN_MESSAGE_TEMPLATE = '{input}\n\n{agent_scratchpad}';
