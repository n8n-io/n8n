import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';

export const GROUP_PADDING_X = 56;
export const GROUP_PADDING_Y_TOP = 40;
export const GROUP_PADDING_Y_BOTTOM = 88;

// The group header (and the collapsed box, which is header-only) matches a
// standard node's height so groups line up with the nodes around them.
export const GROUP_HEADER_HEIGHT = DEFAULT_NODE_SIZE[1];

// When collapsed, the group renders as a compact box: a fixed-width header
// (plus an optional pinned-node list), sharing its top-left anchor with the
// expanded frame so the anchor never moves on collapse/expand.
export const GROUP_COLLAPSED_WIDTH = 400;

// Height of the collapsed box header: ~24px of padding around the title row.
export const GROUP_COLLAPSED_HEIGHT = 72;
