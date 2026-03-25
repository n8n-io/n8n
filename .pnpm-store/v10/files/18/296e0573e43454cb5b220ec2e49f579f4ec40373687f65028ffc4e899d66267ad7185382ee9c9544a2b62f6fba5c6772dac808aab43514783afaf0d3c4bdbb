import type { Breadcrumb } from '@sentry/core';
import type { ReplayContainer } from '../types';
import type { ReplayFrame } from '../types/replayFrame';
type BreadcrumbWithCategory = Required<Pick<Breadcrumb, 'category'>>;
/**
 * Handle breadcrumbs that Sentry captures, and make sure to capture relevant breadcrumbs to Replay as well.
 */
export declare function handleBreadcrumbs(replay: ReplayContainer): void;
/** Exported only for tests. */
export declare function normalizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null;
/** exported for tests only */
export declare function normalizeConsoleBreadcrumb(breadcrumb: Omit<Breadcrumb, 'category'> & BreadcrumbWithCategory): ReplayFrame;
export {};
//# sourceMappingURL=handleBreadcrumbs.d.ts.map