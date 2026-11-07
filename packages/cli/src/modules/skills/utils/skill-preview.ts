import type { SkillPreviewFile } from '@n8n/api-types';

import type { SkillContent } from './skill-content-hash';
import { SKILL_MD } from './skill-md';
import { showHidden, skillMdText } from './skill-text';

/**
 * The most text that the review shows for one skill. Discover lists up to 200 skills, so its
 * answer must stay small. A larger skill shows its first files, and the reviewer reads the rest
 * in the source.
 */
export const SKILL_PREVIEW_MAX_LENGTH = 65_536;

/**
 * The files of a skill as the import keeps them, for the review. The finding locations of the
 * security check point into these texts. SKILL.md always shows, cut at the limit. The first
 * reference that does not fit whole, and every reference after it, is left out.
 */
export function skillPreview(content: SkillContent): {
	files: SkillPreviewFile[];
	truncated: boolean;
} {
	const skillMd = showHidden(skillMdText(content).text);
	const files: SkillPreviewFile[] = [{ path: SKILL_MD, text: cutAtLine(skillMd) }];
	let length = skillMd.length;
	let truncated = length > SKILL_PREVIEW_MAX_LENGTH;
	for (const file of content.files) {
		const text = showHidden(file.content);
		if (length + text.length > SKILL_PREVIEW_MAX_LENGTH) {
			truncated = true;
			break;
		}
		length += text.length;
		files.push({ path: file.path, text });
	}
	return { files, truncated };
}

/**
 * The whole lines of a text that fit the limit. A cut inside a line could split the marker of a
 * hidden character, and a finding on a line counts on the whole line.
 */
function cutAtLine(text: string): string {
	if (text.length <= SKILL_PREVIEW_MAX_LENGTH) return text;
	const lastBreak = text.lastIndexOf('\n', SKILL_PREVIEW_MAX_LENGTH);
	return lastBreak < 0 ? '' : text.slice(0, lastBreak);
}
