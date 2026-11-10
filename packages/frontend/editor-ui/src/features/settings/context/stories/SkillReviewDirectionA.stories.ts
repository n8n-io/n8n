import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { userEvent } from 'storybook/test';

import SkillChangeReview from '../components/review/SkillChangeReview.vue';
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
 * Direction A of the review preview: one list of issues on top, a clean diff that only marks
 * lines, and notes for information.
 */
const meta = {
	title: 'Prototypes/Skill review/Direction A',
	tags: ['!autodocs'],
	parameters: {
		layout: 'fullscreen',
		docs: { story: { inline: false, iframeHeight: 860 } },
	},
	render: prototypeRender(SkillChangeReview, () => {
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

/** A click on an issue opens its file, scrolls to the line and outlines it. */
export const UpdateJumpToIssue: Story = {
	name: 'Update: jump to an issue',
	args: { kind: 'update', updates: [updates.supportTriage] },
	play: async () => {
		// The last issue that has a place to jump to. Its name is the link.
		const issues = await findByTestId('skill-change-review-issues');
		const links = issues.querySelectorAll<HTMLElement>(
			'[data-test-id="skill-change-review-issue"] button, button[data-test-id="skill-change-review-issue"]',
		);
		const last = links[links.length - 1];
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
