import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';

export const GROUP_PADDING_X = 56;
export const GROUP_PADDING_Y_TOP = 40;
export const GROUP_PADDING_Y_BOTTOM = 88;
/** Matches node height */
export const GROUP_HEADER_HEIGHT = DEFAULT_NODE_SIZE[1];
/** Fixed width when collapsed; also the minimum width when expanded. */
export const GROUP_HEADER_WIDTH_COLLAPSED = 400;
/** Character cap on a group description; shared with the backend so validation matches. */
export { GROUP_DESCRIPTION_MAX_LENGTH } from 'n8n-workflow';
/** Below this zoom level all group descriptions and their affordances are hidden. */
export const GROUP_DESCRIPTION_MIN_ZOOM = 0.66;

/**
 * Canvas stacking contract (VueFlow resolves `node.zIndex ?? style.zIndex ?? 0`
 * per node; `elevateNodesOnSelect` additionally adds +1000 to selected nodes):
 *
 *   expanded frame + title bar (-10000)
 *     < sticky notes (-100 + i, see `useWorkflowDocumentRenderData`)
 *     < collapsed group chip (-1)
 *     < edges / regular nodes (0)
 *     < sticky in edit mode (1) / unconnected-node hover (2, see `_vueflow.scss`)
 *
 * The expanded frame sits below stickies so sticky members render crisp inside
 * the group (the frame fill would otherwise tint them). The collapsed chip
 * stays above stickies: members are hidden while collapsed (no tint concern)
 * and the chip is the group's only handle, so it keeps interaction priority
 * over free stickies parked on top of it.
 */
export const GROUP_NODE_Z_INDEX_EXPANDED = -10000;
export const GROUP_NODE_Z_INDEX_COLLAPSED = -1;
