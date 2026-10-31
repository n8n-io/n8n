import type { SkillPreviewFile } from '@n8n/api-types';

import type { SkillContent } from './skill-content-hash';
import { SKILL_MD } from './skill-md';
import { showHidden } from './skill-security-rules';

/**
 * The most text that the picker shows for one skill. A source can list many skills, so the
 * discover answer must stay small. A larger skill shows its first files, and the reviewer
 * reads the rest in the source.
 */
export const SKILL_PREVIEW_MAX_LENGTH = 65_536;

/**
 * The files of a skill as the import keeps them, for the review in the picker. SKILL.md shows
 * each frontmatter key on one line, in the same form as the snippets of the security check, so
 * the picker can find a finding in it.
 */
export function skillPreview(content: SkillContent): {
	files: SkillPreviewFile[];
	truncated: boolean;
} {
	const header = [
		'---',
		`name: ${content.name}`,
		`description: ${content.description}`,
		...Object.entries(content.frontmatter ?? {}).map(
			([key, value]) => `${key}: ${JSON.stringify(value)}`,
		),
		'---',
		'',
	];
	// A name or description can hold line breaks, and each line counts.
	const headerLines = header.join('\n').split('\n').length;
	const all: SkillPreviewFile[] = [
		{
			path: SKILL_MD,
			text: showHidden([...header, content.instructions].join('\n')),
			instructionsLine: headerLines + 1,
		},
		...content.files.map((file) => ({ path: file.path, text: showHidden(file.content) })),
	];
	const files: SkillPreviewFile[] = [];
	let length = 0;
	for (const file of all) {
		length += file.text.length;
		if (length > SKILL_PREVIEW_MAX_LENGTH) return { files, truncated: true };
		files.push(file);
	}
	return { files, truncated: false };
}
