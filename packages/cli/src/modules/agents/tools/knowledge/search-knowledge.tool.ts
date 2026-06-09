import { Tool } from '@n8n/agents/tool';
import { z } from 'zod';

import type { AgentKnowledgeSandboxService } from '../../agent-knowledge-sandbox.service';

const searchKnowledgeInputSchema = z
	.object({
		command: z.string().min(1).max(2_000),
		timeoutMs: z.number().int().positive().max(120_000).optional(),
	})
	.strict()
	.superRefine((input, ctx) => {
		if (!input.command.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['command'],
				message: 'command is required',
			});
		}
	});

const searchKnowledgeOutputSchema = z.object({
	cwd: z.literal('files'),
	command: z.string(),
	result: z.object({
		exitCode: z.number(),
		stdout: z.string(),
		stderr: z.string(),
		stdoutTruncated: z.boolean(),
		stderrTruncated: z.boolean(),
	}),
});

const SEARCH_KNOWLEDGE_SYSTEM_INSTRUCTION = [
	'Commands start in the uploaded knowledge files directory and run inside the sandbox, but only approved read-only discovery commands are accepted.',
	'Destructive or write-oriented commands are never allowed. Do not modify, create, delete, move, chmod, upload, download, or network-fetch files.',
	'Use pipelines with `|` only; do not use `&&`, `||`, `;`, redirection, command substitution, or stderr suppression.',
	'Use `rg --files | rg -i "term|filename|standard" | head -20` for filename discovery.',
	'Use `rg -n --no-heading --color=never "term1|term2" file.txt | head -80` for content search inside a likely file.',
	'Batch all needed citation ranges for one file into one `awk` command, for example `awk \'NR >= 10 && NR <= 20 { print NR ":" $0 } NR >= 40 && NR <= 50 { print NR ":" $0 }\' file.txt`.',
	'Use safe `sed -n "start,endp" file.txt` only for a single simple citation range.',
	'Aim for at most three commands per question: one filename discovery command, one content search command, and one batched citation extraction command.',
	'Do not keep gathering evidence after you have enough lines to answer with citations.',
	'If a command exits nonzero with no output, adjust the read-only search terms rather than switching tools.',
	'Allowed commands include rg, grep, awk, sed without -i, cat, head, tail, wc, sort, uniq, cut, and tr.',
].join(' ');

export function createSearchKnowledgeTool({
	projectId,
	agentId,
	sandboxService,
}: {
	projectId: string;
	agentId: string;
	sandboxService: AgentKnowledgeSandboxService;
}) {
	return new Tool('search_knowledge')
		.description(
			'Run approved read-only sandbox commands over uploaded knowledge files for filename discovery, content search, and citation extraction. Destructive actions are never allowed.',
		)
		.systemInstruction(SEARCH_KNOWLEDGE_SYSTEM_INSTRUCTION)
		.input(searchKnowledgeInputSchema)
		.output(searchKnowledgeOutputSchema)
		.handler(async (input) => {
			const command = input.command.trim();
			const result = await sandboxService.runKnowledgeCommand(projectId, agentId, {
				command,
				timeoutMs: input.timeoutMs,
			});
			return {
				cwd: 'files' as const,
				command,
				result,
			};
		});
}
