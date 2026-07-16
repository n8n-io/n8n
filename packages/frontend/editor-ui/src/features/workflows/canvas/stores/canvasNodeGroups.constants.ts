import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';

export const GROUP_PADDING_X = 56;
export const GROUP_PADDING_Y_TOP = 40;
export const GROUP_PADDING_Y_BOTTOM = 88;
/** Matches node height */
export const GROUP_HEADER_HEIGHT = DEFAULT_NODE_SIZE[1];
/** Fixed width when collapsed; also the minimum width when expanded. */
export const GROUP_HEADER_WIDTH_COLLAPSED = 400;
/** Character cap on a group description; shared with the backend so validation matches. */
export { GROUP_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
/** Below this zoom level all group descriptions and their affordances are hidden. */
export const GROUP_DESCRIPTION_MIN_ZOOM = 0.66;
