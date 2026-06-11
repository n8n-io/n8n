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

// Cap each serialized field to bound judge token cost (matches the report's cap).
const MAX_STEP_CHARS = 2000;

function cap(text: string): string {
	return text.length > MAX_STEP_CHARS
		? `${text.slice(0, MAX_STEP_CHARS)}… (${String(text.length - MAX_STEP_CHARS)} more chars)`
		: text;
}

function capJson(value: unknown): string {
	let str: string;
	try {
		str = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
	} catch {
		str = '<unserializable>';
	}
	return cap(str);
}

function describeStep(step: TranscriptStep): string | null {
	if (step.kind === 'agent-text') {
		return step.text ? `Assistant: ${cap(step.text)}` : null;
	}
	return describeInteraction(step);
}

function describeInteraction(interaction: ToolInteraction): string | null {
	switch (interaction.kind) {
		case 'plan': {
			if (interaction.tasks.length === 0) return null;
			const items = interaction.tasks
				.map((t, i) => {
					const title = t.title ?? `Task ${String(i + 1)}`;
					return t.description ? `${title}: ${t.description}` : title;
				})
				.join('; ');
			return cap(`Plan (${String(interaction.tasks.length)}): ${items}`);
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
					const opts = q.options && q.options.length > 0 ? ` [${q.options.join(' / ')}]` : '';
					const answer = answerByQId.get(q.id);
					return `Q: ${q.question}${opts}${answer ? ` -> A: ${answer}` : ''}`;
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
		case 'setup-card': {
			if (interaction.requests.length === 0) return null;
			const asks = interaction.requests.map((r) => {
				const needs: string[] = [];
				if (r.credentialType) needs.push(`${r.credentialType} credential`);
				if (r.params && r.params.length > 0) needs.push(`params: ${r.params.join(', ')}`);
				return `${r.nodeName}${needs.length > 0 ? ` (${needs.join('; ')})` : ''}`;
			});
			const outcome =
				interaction.outcome === 'filled'
					? `filled${interaction.filled && interaction.filled.length > 0 ? ` (${interaction.filled.join(', ')})` : ''} by user`
					: interaction.outcome === 'skipped'
						? 'skipped by user'
						: interaction.outcome === 'declined'
							? 'dismissed by user'
							: 'no response';
			return `Asked user via setup card: ${asks.join('; ')} — ${outcome}`;
		}
		case 'confirmation': {
			const decision =
				typeof interaction.approved === 'boolean'
					? interaction.approved
						? ' (approved)'
						: ' (rejected)'
					: '';
			// Include the prompt and the user's free-text feedback (e.g. plan-rejection reason).
			const parts = [`Resume ${interaction.toolName}: ${interaction.resumeReason}${decision}`];
			if (interaction.message) parts.push(`prompt: ${cap(interaction.message)}`);
			if (interaction.feedback) parts.push(`user feedback: ${cap(interaction.feedback)}`);
			return parts.join(' — ');
		}
		case 'tool-call': {
			// Args/result are the evidence for node-choice expectations; redacted upstream.
			const parts = [`Tool: ${interaction.toolName}`];
			if (interaction.args && Object.keys(interaction.args).length > 0) {
				parts.push(`args: ${capJson(interaction.args)}`);
			}
			if (interaction.error) {
				parts.push(`error: ${cap(interaction.error)}`);
			} else if (interaction.result !== undefined) {
				parts.push(`result: ${capJson(interaction.result)}`);
			}
			return parts.join(' ');
		}
	}
}
