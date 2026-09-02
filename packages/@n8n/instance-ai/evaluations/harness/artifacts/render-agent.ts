import type { AgentArtifact } from './types';

/** Render the agent artifact: sanitized config + every authored skill's full content. */
export function renderAgentArtifact(artifact: AgentArtifact): string {
	const lines: string[] = ['## Agent config', ''];
	lines.push('```json', JSON.stringify(artifact.config, null, 2), '```', '');

	lines.push('## Agent skills', '');
	const skills = Object.entries(artifact.skills);
	if (skills.length === 0) {
		lines.push('(no skills authored)');
		return lines.join('\n');
	}

	for (const [skillId, skill] of skills) {
		lines.push(`### ${skill.name} (\`${skillId}\`)`, '');
		lines.push(`**Description:** ${skill.description}`, '');
		if (skill.allowedTools && skill.allowedTools.length > 0) {
			lines.push(`**Allowed tools:** ${skill.allowedTools.join(', ')}`, '');
		}
		lines.push('**Instructions:**', '', skill.instructions, '');

		if (skill.references && skill.references.length > 0) {
			lines.push('**References:**', '');
			for (const reference of skill.references) {
				lines.push(`- \`${reference.path}\``, '', '```markdown', reference.content, '```', '');
			}
		}
	}

	return lines.join('\n');
}
