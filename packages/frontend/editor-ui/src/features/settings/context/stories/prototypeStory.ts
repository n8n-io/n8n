// The render of the preview prototype stories: the shell dialog with the preview of one
// direction. Each direction passes its preview component and the functions that build its model.
import type { DiscoveredSkill, SkillPendingUpdate } from '@n8n/api-types';
import { N8nButton } from '@n8n/design-system';
import type { Meta } from '@storybook/vue3-vite';
import { useI18n } from '@n8n/i18n';
import { ref, type Component } from 'vue';

import PrototypeReviewDialog from './PrototypeReviewDialog.vue';
import { prototypeItems, type PrototypeArgs } from './prototypeItems';
import { TEAM_PROJECT, commit } from './skillReview.fixtures';

/** The scope name in the messages, such as a name clash. */
export const PROTOTYPE_SCOPE = TEAM_PROJECT.name;

export function prototypeRender<Model>(
	Preview: Component,
	useModels: () => {
		update: (update: SkillPendingUpdate) => Model;
		skill: (skill: DiscoveredSkill) => Model;
	},
): NonNullable<Meta<PrototypeArgs>['render']> {
	return (args) => ({
		components: { PrototypeReviewDialog, N8nButton, Preview },
		setup() {
			const i18n = useI18n();
			const isUpdate = args.kind === 'update';
			return {
				open: ref(true),
				items: prototypeItems(args, useModels()),
				kind: args.kind,
				title: i18n.baseText(
					isUpdate
						? 'settings.context.skills.updates.title'
						: 'settings.context.skills.connect.choose.title',
				),
				details: isUpdate
					? i18n.baseText('settings.context.skills.updates.latestCommit', {
							interpolate: { commit: `${commit.message} · ${commit.author}` },
						})
					: undefined,
				source: 'acme/agent-skills · main',
				importTarget: PROTOTYPE_SCOPE,
			};
		},
		template: `
			<div style="padding: var(--spacing--md)">
				<N8nButton label="Open review" @click="open = true" />
				<PrototypeReviewDialog
					v-model:open="open"
					:title="title"
					:source="source"
					:details="details"
					:kind="kind"
					:items="items"
					:import-target="importTarget"
				>
					<template #preview="{ item }">
						<Preview :model="item.model" />
					</template>
				</PrototypeReviewDialog>
			</div>
		`,
	});
}
