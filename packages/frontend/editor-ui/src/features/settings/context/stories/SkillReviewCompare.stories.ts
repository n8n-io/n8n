import type { DiscoveredSkill, SkillPendingUpdate } from '@n8n/api-types';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import SkillSplitReview from '../components/review/SkillSplitReview.vue';
import { useSkillChangeReview } from '../components/review/skillChangeReview';
import { PROTOTYPE_SCOPE } from './prototypeStory';
import { discoveredSkills, updates } from './skillReview.fixtures';

/**
 * The preview pane of direction C on its own, for one skill, in one view, so its docs can show
 * the Issues view and the Changes view side by side. These stories render inline and do not
 * show in the sidebar.
 */
type Args = {
	view: 'issues' | 'changes';
	update?: SkillPendingUpdate;
	skill?: DiscoveredSkill;
};

const meta = {
	title: 'Prototypes/Skill review/Compare',
	tags: ['!dev', '!autodocs'],
	parameters: { layout: 'fullscreen', docs: { canvas: { sourceState: 'none' } } },
	render: (args) => ({
		components: { SkillSplitReview },
		setup() {
			const review = useSkillChangeReview();
			const model = args.update
				? review.fromPendingUpdate(args.update, PROTOTYPE_SCOPE)
				: args.skill
					? review.fromDiscoveredSkill(args.skill, PROTOTYPE_SCOPE)
					: null;
			return { args, model };
		},
		// The frame has the padding and the surface of the preview pane in the dialog.
		template: `
			<div style="padding: var(--spacing--sm); background-color: var(--background--surface)">
				<SkillSplitReview v-if="model" :model="model" :initial-view="args.view" />
			</div>
		`,
	}),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

const cases = {
	PermissionChange: { update: updates.supportTriage },
	HiddenCharacter: { update: updates.webResearch },
	Passed: { update: updates.brandVoice },
	Blocked: { update: updates.dataLoader },
	NameClash: { update: updates.invoiceParser },
	Unreadable: { update: updates.unreadable },
	ImportWarning: { skill: discoveredSkills.supportTriage },
	ImportNameTaken: { skill: discoveredSkills.nameTaken },
} satisfies Record<string, Omit<Args, 'view'>>;

export const CIssuesPermissionChange: Story = {
	args: { view: 'issues', ...cases.PermissionChange },
};
export const CIssuesHiddenCharacter: Story = {
	args: { view: 'issues', ...cases.HiddenCharacter },
};
export const CIssuesPassed: Story = { args: { view: 'issues', ...cases.Passed } };
export const CIssuesBlocked: Story = { args: { view: 'issues', ...cases.Blocked } };
export const CIssuesNameClash: Story = {
	args: { view: 'issues', ...cases.NameClash },
};
export const CIssuesUnreadable: Story = {
	args: { view: 'issues', ...cases.Unreadable },
};
export const CIssuesImportWarning: Story = {
	args: { view: 'issues', ...cases.ImportWarning },
};
export const CIssuesImportNameTaken: Story = {
	args: { view: 'issues', ...cases.ImportNameTaken },
};
export const CChangesPermissionChange: Story = {
	args: { view: 'changes', ...cases.PermissionChange },
};
export const CChangesHiddenCharacter: Story = {
	args: { view: 'changes', ...cases.HiddenCharacter },
};
export const CChangesPassed: Story = { args: { view: 'changes', ...cases.Passed } };
export const CChangesBlocked: Story = { args: { view: 'changes', ...cases.Blocked } };
export const CChangesNameClash: Story = {
	args: { view: 'changes', ...cases.NameClash },
};
export const CChangesUnreadable: Story = {
	args: { view: 'changes', ...cases.Unreadable },
};
export const CChangesImportWarning: Story = {
	args: { view: 'changes', ...cases.ImportWarning },
};
export const CChangesImportNameTaken: Story = {
	args: { view: 'changes', ...cases.ImportNameTaken },
};
