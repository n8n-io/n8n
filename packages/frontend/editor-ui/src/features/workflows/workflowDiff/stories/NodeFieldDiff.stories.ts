import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { onBeforeUnmount } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';

import NodeDiff from '../NodeDiff.vue';
import NodeFieldDiff from '../NodeFieldDiff.vue';
import WorkflowDiffAside from '../WorkflowDiffAside.vue';
import { nodeDiffJson } from '../useWorkflowDiffUI';
import { nodePairs } from './nodeFieldDiff.fixtures';

type Args = { pair: keyof typeof nodePairs };

/**
 * Direction B of the skill review, applied to the node diff of the workflow diff. Both frames
 * are the real aside panel of the workflow diff. Left: the fields. Right: the JSON view of today.
 */

/**
 * The code diffs take their colours from the app theme. In Storybook the app theme follows the
 * system, so it can differ from the theme of the page. It follows the page here.
 */
/**
 * The expression input of a parameter has a modal that teleports to `#app-modals`. The app has
 * that element. Storybook does not, and Vue then fails to unmount the input.
 */
function ensureModalTarget() {
	if (document.getElementById('app-modals')) return;
	const target = document.createElement('div');
	target.id = 'app-modals';
	document.body.appendChild(target);
}

function useStorybookTheme() {
	const uiStore = useUIStore();
	// `setTheme` writes `data-theme` on the body again, and the observer sees that write. Only a
	// real change may call it, or the two call each other with no end.
	const sync = () => {
		const theme = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
		if (uiStore.theme !== theme) uiStore.setTheme(theme);
	};
	sync();
	const observer = new MutationObserver(sync);
	observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
	onBeforeUnmount(() => observer.disconnect());
}
const meta = {
	title: 'Prototypes/Workflow diff/Node fields',
	tags: ['!autodocs'],
	parameters: { layout: 'fullscreen' },
	argTypes: {
		pair: { control: 'select', options: Object.keys(nodePairs) },
	},
	render: (args) => ({
		components: { NodeDiff, NodeFieldDiff, WorkflowDiffAside },
		setup() {
			useStorybookTheme();
			ensureModalTarget();
			const pair = nodePairs[args.pair];
			const before = 'before' in pair ? pair.before : undefined;
			return {
				pair,
				before,
				// The panel header shows the newer node, as the app does.
				node: pair.after ?? before,
				oldString: nodeDiffJson(before),
				newString: nodeDiffJson(pair.after),
				credentialLabel: (type: string) => (type === 'zendeskApi' ? 'Zendesk API' : type),
			};
		},
		template: `
			<div style="display: flex; gap: var(--spacing--lg); padding: var(--spacing--md); align-items: flex-start">
				<section v-for="column in ['fields', 'json']" :key="column" style="flex-shrink: 0">
					<p style="font-size: var(--font-size--sm); font-weight: var(--font-weight--bold); margin-bottom: var(--spacing--xs)">
						{{ column === 'fields' ? 'Fields (direction B)' : 'JSON (today)' }}
					</p>
					<div style="display: flex; height: 760px; border-right: var(--border); border-bottom: var(--border); background: var(--color--background--light-2)">
						<WorkflowDiffAside :node="node">
							<template #default="{ outputFormat }">
								<NodeFieldDiff
									v-if="column === 'fields'"
									:before="before"
									:after="pair.after"
									:node-type="pair.nodeType"
									:credential-label="credentialLabel"
								/>
								<NodeDiff
									v-else
									:old-string="oldString"
									:new-string="newString"
									:output-format="outputFormat"
								/>
							</template>
						</WorkflowDiffAside>
					</div>
				</section>
			</div>
		`,
	}),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AiAgent: Story = { name: 'AI Agent', args: { pair: 'aiAgent' } };
export const HttpRequest: Story = { name: 'HTTP Request', args: { pair: 'httpRequest' } };
export const Code: Story = { name: 'Code', args: { pair: 'code' } };
export const AddedNode: Story = { name: 'Added AI Agent', args: { pair: 'added' } };
