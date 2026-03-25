import { startInactiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, getActiveSpan } from '@sentry/browser';
import { debug, timestampInSeconds } from '@sentry/core';
import { DEFAULT_HOOKS } from './constants.js';
import { DEBUG_BUILD } from './debug-build.js';
import { formatComponentName } from './vendor/components.js';

const VUE_OP = 'ui.vue';

// Mappings from operation to corresponding lifecycle hook.
const HOOKS = {
  activate: ['activated', 'deactivated'],
  create: ['beforeCreate', 'created'],
  // Vue 3
  unmount: ['beforeUnmount', 'unmounted'],
  // Vue 2
  destroy: ['beforeDestroy', 'destroyed'],
  mount: ['beforeMount', 'mounted'],
  update: ['beforeUpdate', 'updated'],
};

/** End the top-level component span and activity with a debounce configured using `timeout` option */
function maybeEndRootComponentSpan(vm, timestamp, timeout) {
  if (vm.$_sentryRootComponentSpanTimer) {
    clearTimeout(vm.$_sentryRootComponentSpanTimer);
  }

  vm.$_sentryRootComponentSpanTimer = setTimeout(() => {
    if (vm.$root?.$_sentryRootComponentSpan) {
      vm.$root.$_sentryRootComponentSpan.end(timestamp);
      vm.$root.$_sentryRootComponentSpan = undefined;
    }
  }, timeout);
}

/** Find if the current component exists in the provided `TracingOptions.trackComponents` array option. */
function findTrackComponent(trackComponents, formattedName) {
  function extractComponentName(name) {
    return name.replace(/^<([^\s]*)>(?: at [^\s]*)?$/, '$1');
  }

  const isMatched = trackComponents.some(compo => {
    return extractComponentName(formattedName) === extractComponentName(compo);
  });

  return isMatched;
}

const createTracingMixins = (options = {}) => {
  const hooks = (options.hooks || [])
    .concat(DEFAULT_HOOKS)
    // Removing potential duplicates
    .filter((value, index, self) => self.indexOf(value) === index);

  const mixins = {};

  const rootComponentSpanFinalTimeout = options.timeout || 2000;

  for (const operation of hooks) {
    // Retrieve corresponding hooks from Vue lifecycle.
    // eg. mount => ['beforeMount', 'mounted']
    const internalHooks = HOOKS[operation];
    if (!internalHooks) {
      DEBUG_BUILD && debug.warn(`Unknown hook: ${operation}`);
      continue;
    }

    for (const internalHook of internalHooks) {
      mixins[internalHook] = function () {
        const isRootComponent = this.$root === this;

        // 1. Root Component span creation
        if (isRootComponent) {
          this.$_sentryRootComponentSpan =
            this.$_sentryRootComponentSpan ||
            startInactiveSpan({
              name: 'Application Render',
              op: `${VUE_OP}.render`,
              attributes: {
                [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.vue',
              },
              onlyIfParent: true,
            });

          // call debounced end function once directly, just in case no child components call it
          maybeEndRootComponentSpan(this, timestampInSeconds(), rootComponentSpanFinalTimeout);
        }

        // 2. Component tracking filter
        const componentName = formatComponentName(this, false);

        const shouldTrack =
          isRootComponent || // We always want to track the root component
          (Array.isArray(options.trackComponents)
            ? findTrackComponent(options.trackComponents, componentName)
            : options.trackComponents);

        // We always want to track root component
        if (!shouldTrack) {
          // even if we don't track `this` component, we still want to end the root span eventually
          maybeEndRootComponentSpan(this, timestampInSeconds(), rootComponentSpanFinalTimeout);
          return;
        }

        this.$_sentryComponentSpans = this.$_sentryComponentSpans || {};

        // 3. Span lifecycle management based on the hook type
        const isBeforeHook = internalHook === internalHooks[0];
        const activeSpan = this.$root?.$_sentryRootComponentSpan || getActiveSpan();

        if (isBeforeHook) {
          // Starting a new span in the "before" hook
          if (activeSpan) {
            // Cancel any existing span for this operation (safety measure)
            // We're actually not sure if it will ever be the case that cleanup hooks were not called.
            // However, we had users report that spans didn't end, so we end the span before
            // starting a new one, just to be sure.
            const oldSpan = this.$_sentryComponentSpans[operation];
            if (oldSpan) {
              oldSpan.end();
            }

            this.$_sentryComponentSpans[operation] = startInactiveSpan({
              name: `Vue ${componentName}`,
              op: `${VUE_OP}.${operation}`,
              attributes: {
                [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.vue',
              },
              // UI spans should only be created if there is an active root span (transaction)
              onlyIfParent: true,
            });
          }
        } else {
          // The span should already be added via the first handler call (in the 'before' hook)
          const span = this.$_sentryComponentSpans[operation];
          // The before hook did not start the tracking span, so the span was not added.
          // This is probably because it happened before there is an active transaction
          if (!span) return; // Skip if no span was created in the "before" hook
          span.end();

          // For any "after" hook, also schedule the root component span to end
          maybeEndRootComponentSpan(this, timestampInSeconds(), rootComponentSpanFinalTimeout);
        }
      };
    }
  }

  return mixins;
};

export { createTracingMixins, findTrackComponent };
//# sourceMappingURL=tracing.js.map
