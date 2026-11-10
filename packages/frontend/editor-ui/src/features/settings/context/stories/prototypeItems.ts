// The rows of the prototype review dialog, built from the fixtures. Each direction passes its
// own function that turns an update or a skill into the model of its preview.
import type { DiscoveredSkill, SkillPendingUpdate } from '@n8n/api-types';

import { statusesOf, type SkillStatus } from '../components/skillReview.types';

export type ReviewTab = 'review' | 'ready' | 'unavailable';

export type PrototypeItem<Model> = {
	id: string;
	title: string;
	subtitle?: string;
	tab: ReviewTab;
	decidable: boolean;
	statuses: SkillStatus[];
	group?: { id: string; name: string };
	model: Model;
};

export type PrototypeArgs =
	| { kind: 'update'; updates: SkillPendingUpdate[] }
	| { kind: 'import'; skills: DiscoveredSkill[] };

function updateTab(update: SkillPendingUpdate): ReviewTab {
	if (update.check.verdict === 'blocked' || update.nameClash) return 'unavailable';
	return update.check.verdict === 'needs_review' ? 'review' : 'ready';
}

function importTab(skill: DiscoveredSkill): ReviewTab {
	if (skill.nameTaken || skill.error || skill.check?.verdict === 'blocked') return 'unavailable';
	return skill.check?.verdict === 'needs_review' ? 'review' : 'ready';
}

export function prototypeItems<Model>(
	args: PrototypeArgs,
	toModel: {
		update: (update: SkillPendingUpdate) => Model;
		skill: (skill: DiscoveredSkill) => Model;
	},
): Array<PrototypeItem<Model>> {
	if (args.kind === 'update') {
		return args.updates.map((update) => ({
			id: update.skillId,
			title: update.name,
			subtitle: update.location,
			tab: updateTab(update),
			decidable: updateTab(update) !== 'unavailable',
			statuses: update.nameClash
				? [{ kind: 'error', count: 1 }]
				: statusesOf(update.check.findings, !update.update),
			model: toModel.update(update),
		}));
	}
	return args.skills.map((skill) => ({
		id: skill.key,
		title: skill.name ?? skill.location.split('/').pop() ?? skill.location,
		subtitle: skill.description ?? undefined,
		tab: importTab(skill),
		decidable: importTab(skill) !== 'unavailable',
		statuses: skill.nameTaken
			? [{ kind: 'error', count: 1 }]
			: statusesOf(skill.check?.findings ?? [], !!skill.error),
		...(skill.group ? { group: skill.group } : {}),
		model: toModel.skill(skill),
	}));
}
