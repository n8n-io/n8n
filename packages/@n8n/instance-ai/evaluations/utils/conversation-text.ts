import type { ToolInteraction, TranscriptStep, TranscriptTurn } from '../types';

/**
 * User-side turns from a captured transcript, flattened as a text block for
 * prompt-aware checks. Single-turn → plain text; multi-turn → numbered prefix.
 */
export function userTurnsAsText(transcript: TranscriptTurn[]): string {
	const turns = transcript
		.map((t) => t.userMessage)
		.filter((m): m is string => typeof m === 'string' && m.length > 0);

	if (turns.length === 0) return '';
	if (turns.length === 1) return turns[0];
	return turns.map((text, i) => `Turn ${String(i + 1)}: ${text}`).join('\n\n');
}

/** Full transcript (agent narration + tool interactions, in order) as plain text for LLM-judged checks. */
export function transcriptAsText(transcript: TranscriptTurn[]): string {
	return transcript
		.map((turn, i) => {
			const lines: string[] = [`### Turn ${String(i + 1)}`];
			if (turn.userMessage) lines.push(`User: ${turn.userMessage}`);
			for (const step of turn.steps) {
				const line = describeStep(step);
				if (line) lines.push(line);
			}
			return lines.join('\n');
		})
		.join('\n\n');
}

/** Concatenated agent narration across a turn's steps (excludes tool interactions). */
export function agentTextOf(turn: TranscriptTurn): string {
	return turn.steps.flatMap((s) => (s.kind === 'agent-text' ? [s.text] : [])).join('');
}

function describeStep(step: TranscriptStep): string | null {
	if (step.kind === 'agent-text') {
		return step.text ? `Assistant: ${step.text}` : null;
	}
	return describeInteraction(step);
}

function describeInteraction(interaction: ToolInteraction): string | null {
	switch (interaction.kind) {
		case 'plan': {
			if (interaction.tasks.length === 0) return null;
			const titles = interaction.tasks.map((t, i) => t.title ?? `Task ${String(i + 1)}`).join('; ');
			return `Plan (${String(interaction.tasks.length)}): ${titles}`;
		}
		case 'ask-user': {
			if (interaction.questions.length === 0) return null;
			const answerByQId = new Map<string, string>();
			for (const a of interaction.answers ?? []) {
				const text = a.skipped
					? '(skipped)'
					: [a.selectedOptions.join(', '), a.customText].filter(Boolean).join(' — ');
				if (text) answerByQId.set(a.questionId, text);
			}
			const qs = interaction.questions
				.map((q) => {
					const answer = answerByQId.get(q.id);
					return `Q: ${q.question}${answer ? ` -> A: ${answer}` : ''}`;
				})
				.join(' | ');
			return `Asked user: ${qs}`;
		}
		case 'setup-wizard': {
			const parts: string[] = [];
			if (interaction.completedNodes.length > 0) {
				const configured = interaction.completedNodes.map((c) =>
					c.parametersSet && c.parametersSet.length > 0
						? `${c.nodeName} (${c.parametersSet.join(', ')})`
						: c.nodeName,
				);
				parts.push(`configured ${configured.join('; ')}`);
			}
			if (interaction.skippedNodes.length > 0) {
				const skipped = interaction.skippedNodes.map(
					(s) =>
						`${s.nodeName}${s.credentialType ? ` (needs ${s.credentialType} credential)` : ' (needs parameters)'}`,
				);
				parts.push(`skipped ${skipped.join(', ')}`);
			}
			const body = parts.length > 0 ? parts.join('; ') : 'nothing to apply';
			return `Setup wizard: ${body}${interaction.reason ? ` — ${interaction.reason}` : ''}`;
		}
		case 'confirmation': {
			const decision =
				typeof interaction.approved === 'boolean'
					? interaction.approved
						? ' (approved)'
						: ' (rejected)'
					: '';
			return `Resume ${interaction.toolName}: ${interaction.resumeReason}${decision}`;
		}
		case 'tool-call':
			return `Tool: ${interaction.toolName}`;
	}
}
