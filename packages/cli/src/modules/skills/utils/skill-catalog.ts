import type { SkillCatalogCategory } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/** A fallback grouping for this pilot. These labels are n8n's, not author claims. */
export function categorizeSkill(name: string, description = ''): SkillCatalogCategory {
	const normalize = (value: string) => value.toLowerCase().replace(/[-_]/g, ' ');
	const rules: Array<[SkillCatalogCategory, RegExp]> = [
		['documents', /\b(pdf|docx|xlsx|pptx|spreadsheet|presentation|document|slides)\b/],
		['design', /\b(design|ui|ux|figma|typography|canvas|image|video|animation)\b/],
		[
			'marketing',
			/\b(marketing|seo|copywriting|sales|campaign|social media|brand|content writing|reddit|linkedin)\b/,
		],
		['data', /\b(data|sql|database|analytics|analysis|postgres|supabase|csv|chart)\b/],
		['research', /\b(research|search|browse|browser|scrape|summarize|knowledge|find skills)\b/],
		[
			'operations',
			/\b(deploy|deployment|devops|cloud|docker|kubernetes|security|monitor|automation)\b/,
		],
		[
			'development',
			/\b(code|codebase|architecture|coding|react|next|vue|typescript|javascript|python|test|testing|debug|git|frontend|backend|api|developer|development|refactor|programming|tdd)\b/,
		],
	];
	// Names state the task more directly. Long descriptions often list unrelated examples.
	return (
		rules.find(([, pattern]) => pattern.test(normalize(name)))?.[0] ??
		rules.find(([, pattern]) => pattern.test(normalize(description)))?.[0] ??
		'other'
	);
}

/** Read only the serialized leaderboard props. Never evaluate page scripts. */
export function readPublicLeaderboard(html: string): unknown[] {
	const chunks: string[] = [];
	for (const match of html.matchAll(/<script>self\.__next_f\.push\((.*?)\)<\/script>/gs)) {
		try {
			const chunk: unknown = JSON.parse(match[1]);
			if (Array.isArray(chunk) && chunk[0] === 1 && typeof chunk[1] === 'string') {
				chunks.push(chunk[1]);
			}
		} catch {
			/* Ignore scripts that do not carry JSON data. */
		}
	}
	for (const line of chunks.join('').split('\n')) {
		const separator = line.indexOf(':');
		if (separator === -1) continue;
		try {
			const node: unknown = JSON.parse(line.slice(separator + 1));
			if (!Array.isArray(node) || !isRecord(node[3])) continue;
			const skills = node[3].initialSkills;
			if (Array.isArray(skills) && skills.length <= 1000) return skills;
		} catch {
			/* Other stream records are not leaderboard props. */
		}
	}
	throw new Error('The public leaderboard data is unavailable.');
}
