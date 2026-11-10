import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { userEvent } from 'storybook/test';

import SkillSplitReview from '../components/review/SkillSplitReview.vue';
import { useSkillChangeReview } from '../components/review/skillChangeReview';
import type { PrototypeArgs } from './prototypeItems';
import { PROTOTYPE_SCOPE, prototypeRender } from './prototypeStory';
import {
	allImportSkills,
	allUpdates,
	discoveredSkills,
	groupedSkills,
	updates,
} from './skillReview.fixtures';
import { findByTestId } from './storyHelpers';

/**
 * Direction C of the review preview: a switch between an Issues view and a Changes view, so the
 * issues and the diff do not show at the same time. The Changes view is the diff of direction A.
 */
const meta = {
	title: 'Prototypes/Skill review/Direction C',
	tags: ['!autodocs'],
	parameters: {
		layout: 'fullscreen',
		docs: { story: { inline: false, iframeHeight: 860 } },
	},
	render: prototypeRender(SkillSplitReview, () => {
		const review = useSkillChangeReview();
		return {
			update: (update) => review.fromPendingUpdate(update, PROTOTYPE_SCOPE),
			skill: (skill) => review.fromDiscoveredSkill(skill, PROTOTYPE_SCOPE),
		};
	}),
} satisfies Meta<PrototypeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------------------------
// Update review
// ---------------------------------------------------------------------------------------------

/** Every update state in one dialog. Use the tabs and the list to move between them. */
export const UpdateAllStates: Story = {
	name: 'Update: all states',
	args: { kind: 'update', updates: allUpdates },
};

export const UpdateHiddenCharacter: Story = {
	name: 'Update: hidden character',
	args: { kind: 'update', updates: [updates.webResearch] },
};

export const UpdatePermissionChange: Story = {
	name: 'Update: permission change',
	args: { kind: 'update', updates: [updates.supportTriage] },
};

/** The Changes view of a skill with issues: the diff, with the issues in the gutter only. */
export const UpdateChangesView: Story = {
	name: 'Update: changes view',
	args: { kind: 'update', updates: [updates.supportTriage] },
	play: async () => {
		const control = await findByTestId('skill-split-review-view');
		const option = [...control.querySelectorAll<HTMLElement>('[role="radio"]')].find((element) =>
			element.textContent?.includes('Changes'),
		);
		if (option) await userEvent.click(option);
	},
};

/** "Show in changes" switches the view, opens the file, scrolls to the line and outlines it. */
export const UpdateJumpToIssue: Story = {
	name: 'Update: show an issue in changes',
	args: { kind: 'update', updates: [updates.supportTriage] },
	play: async () => {
		await findByTestId('skill-split-review-issues');
		const buttons = document.querySelectorAll<HTMLElement>(
			'[data-test-id="skill-split-review-show"]',
		);
		const last = buttons[buttons.length - 1];
		if (last) await userEvent.click(last);
	},
};

export const UpdatePassed: Story = {
	name: 'Update: passed',
	args: { kind: 'update', updates: [updates.brandVoice] },
};

export const UpdateFrontmatter: Story = {
	name: 'Update: frontmatter change',
	args: { kind: 'update', updates: [updates.releaseNotes] },
};

export const UpdateBlocked: Story = {
	name: 'Update: blocked by the check',
	args: { kind: 'update', updates: [updates.dataLoader] },
};

export const UpdateNameClash: Story = {
	name: 'Update: name clash',
	args: { kind: 'update', updates: [updates.invoiceParser] },
};

export const UpdateNameClashAgent: Story = {
	name: 'Update: name clash in an agent',
	args: { kind: 'update', updates: [updates.meetingNotesClash] },
};

export const UpdateUnreadable: Story = {
	name: 'Update: unreadable SKILL.md',
	args: { kind: 'update', updates: [updates.unreadable] },
};

// ---------------------------------------------------------------------------------------------
// Import review
// ---------------------------------------------------------------------------------------------

/** Every import state in one dialog. Use the tabs and the list to move between them. */
export const ImportAllStates: Story = {
	name: 'Import: all states',
	args: { kind: 'import', skills: allImportSkills },
};

export const ImportPassed: Story = {
	name: 'Import: passed',
	args: { kind: 'import', skills: [discoveredSkills.brandVoice] },
};

export const ImportPluginGroups: Story = {
	name: 'Import: plugin groups',
	args: { kind: 'import', skills: groupedSkills },
};

export const ImportNameTaken: Story = {
	name: 'Import: name taken',
	args: { kind: 'import', skills: [discoveredSkills.nameTaken] },
};

export const ImportUnreadable: Story = {
	name: 'Import: unreadable skill',
	args: { kind: 'import', skills: [discoveredSkills.unreadable] },
};

export const ImportLarge: Story = {
	name: 'Import: preview too large',
	args: { kind: 'import', skills: [discoveredSkills.largeSkill] },
};
