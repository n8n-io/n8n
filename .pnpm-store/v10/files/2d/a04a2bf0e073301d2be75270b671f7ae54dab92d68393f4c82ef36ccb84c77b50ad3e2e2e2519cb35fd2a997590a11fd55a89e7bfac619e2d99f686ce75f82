import { getClient, getIsolationScope } from './currentScopes.js';
import { consoleSandbox } from './utils/debug-logger.js';
import { dateTimestampInSeconds } from './utils/time.js';

/**
 * Default maximum number of breadcrumbs added to an event. Can be overwritten
 * with {@link Options.maxBreadcrumbs}.
 */
const DEFAULT_BREADCRUMBS = 100;

/**
 * Records a new breadcrumb which will be attached to future events.
 *
 * Breadcrumbs will be added to subsequent events to provide more context on
 * user's actions prior to an error or crash.
 */
function addBreadcrumb(breadcrumb, hint) {
  const client = getClient();
  const isolationScope = getIsolationScope();

  if (!client) return;

  const { beforeBreadcrumb = null, maxBreadcrumbs = DEFAULT_BREADCRUMBS } = client.getOptions();

  if (maxBreadcrumbs <= 0) return;

  const timestamp = dateTimestampInSeconds();
  const mergedBreadcrumb = { timestamp, ...breadcrumb };
  const finalBreadcrumb = beforeBreadcrumb
    ? consoleSandbox(() => beforeBreadcrumb(mergedBreadcrumb, hint))
    : mergedBreadcrumb;

  if (finalBreadcrumb === null) return;

  if (client.emit) {
    client.emit('beforeAddBreadcrumb', finalBreadcrumb, hint);
  }

  isolationScope.addBreadcrumb(finalBreadcrumb, maxBreadcrumbs);
}

export { addBreadcrumb };
//# sourceMappingURL=breadcrumbs.js.map
