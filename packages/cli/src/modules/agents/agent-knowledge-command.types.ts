export const AGENT_KNOWLEDGE_COMMANDS = ['git_grep', 'cat', 'sed'] as const;

export type AgentKnowledgeCommand = (typeof AGENT_KNOWLEDGE_COMMANDS)[number];

export type AgentKnowledgeCommandRequest =
	| {
			command: 'git_grep';
			pattern: string;
			outputMode?: 'count';
			caseInsensitive?: boolean;
			fixedStrings?: boolean;
			context?: number;
			files?: string[];
	  }
	| {
			command: 'cat';
			file: string;
	  }
	| {
			command: 'sed';
			file: string;
			startLine: number;
			endLine: number;
	  };

export interface AgentKnowledgeCommandResult {
	command: AgentKnowledgeCommand;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	truncated: boolean;
}
