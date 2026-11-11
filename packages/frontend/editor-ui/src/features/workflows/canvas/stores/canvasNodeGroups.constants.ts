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
 *   free sticky notes (-10100 + i)
 *     < expanded frame + title bar (-5000)
 *     < sticky notes in a group (-100 + i)
 *     < collapsed group chip (-1)
 *     < edges / regular nodes (0) / collapsed empty-group chip (0)
 *     < sticky in edit mode (1) / unconnected-node hover (2, see `_vueflow.scss`)
 *
 * `useWorkflowDocumentRenderData` gives every sticky `-100 + i` (overlap
 * order). The canvas mapping moves stickies that are not in a group down by
 * `FREE_STICKY_Z_INDEX_OFFSET`, so an expanded group paints over a free sticky
 * placed on it. Sticky members stay above the frame so they render crisp
 * inside the group (the frame fill would otherwise tint them). The collapsed
 * chip stays above all stickies: members are hidden while collapsed (no tint
 * concern) and the chip is the group's only handle.
 */
export const FREE_STICKY_Z_INDEX_OFFSET = -10000;
export const GROUP_NODE_Z_INDEX_EXPANDED = -5000;
export const GROUP_NODE_Z_INDEX_COLLAPSED = -1;
/**
 * Empty collapsed groups expose handles, which must paint above their edges.
 * Keep them in the regular node layer instead of below the edge layer.
 */
export const GROUP_NODE_Z_INDEX_EMPTY_COLLAPSED = 0;
