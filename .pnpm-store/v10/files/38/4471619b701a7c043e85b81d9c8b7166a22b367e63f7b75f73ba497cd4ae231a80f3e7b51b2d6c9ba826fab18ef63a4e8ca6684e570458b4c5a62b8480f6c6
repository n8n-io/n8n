/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { isFirefox, isLegacyEdge } from 'common/Platform';

export const INVERTED_DEFAULT_COLOR = 257;

export const DIM_OPACITY = 0.5;
// The text baseline is set conditionally by browser. Using 'ideographic' for Firefox or Legacy Edge
// would result in truncated text (Issue 3353). Using 'bottom' for Chrome would result in slightly
// unaligned Powerline fonts (PR 3356#issuecomment-850928179).
export const TEXT_BASELINE: CanvasTextBaseline = isFirefox || isLegacyEdge ? 'bottom' : 'ideographic';
