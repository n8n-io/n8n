export type AgentKnowledgeCommandRequest =
	| {
			command: 'search';
			pattern: string;
			outputMode?: 'count';
			caseInsensitive?: boolean;
			fixedStrings?: boolean;
			context?: number;
			files?: string[];
	  }
	| {
			command: 'read';
			file: string;
			startLine?: number;
			endLine?: number;
	  };

export interface AgentKnowledgeCommandResult {
	command: 'search' | 'read';
	exitCode: number | null;
	stdout: string;
	stderr: string;
	truncated: boolean;
}
