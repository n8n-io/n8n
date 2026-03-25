import { getGlobalScope, addBreadcrumb, getCurrentScope, getClient, addNonEnumerableProperty } from '@sentry/core';

// Inline Pinia types

const DEFAULT_PINIA_PLUGIN_OPTIONS = {
  attachPiniaState: true,
  addBreadcrumbs: true,
  actionTransformer: action => action,
  stateTransformer: state => state,
};

const getAllStoreStates = (
  pinia,
  stateTransformer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => {
  const states = {};

  try {
    Object.keys(pinia.state.value).forEach(storeId => {
      states[storeId] = pinia.state.value[storeId];
    });

    return stateTransformer ? stateTransformer(states) : states;
  } catch {
    return states;
  }
};

const createSentryPiniaPlugin

 = userOptions => {
  const options = { ...DEFAULT_PINIA_PLUGIN_OPTIONS, ...userOptions };

  const plugin = ({ store, pinia }) => {
    options.attachPiniaState !== false &&
      getGlobalScope().addEventProcessor((event, hint) => {
        try {
          // Get current timestamp in hh:mm:ss
          const timestamp = new Date().toTimeString().split(' ')[0];
          const filename = `pinia_state_all_stores_${timestamp}.json`;

          // event processor runs for each pinia store - attachment should only be added once per event
          const hasExistingPiniaStateAttachment = hint.attachments?.some(attachment =>
            attachment.filename.startsWith('pinia_state_all_stores_'),
          );

          if (!hasExistingPiniaStateAttachment) {
            hint.attachments = [
              ...(hint.attachments || []),
              {
                filename,
                data: JSON.stringify(getAllStoreStates(pinia, options.stateTransformer)),
              },
            ];
          }
        } catch {
          // empty
        }

        return event;
      });

    store.$onAction(context => {
      context.after(() => {
        const transformedActionName = options.actionTransformer(context.name);

        if (
          typeof transformedActionName !== 'undefined' &&
          transformedActionName !== null &&
          options.addBreadcrumbs !== false
        ) {
          addBreadcrumb({
            category: 'pinia.action',
            message: `Store: ${store.$id} | Action: ${transformedActionName}`,
            level: 'info',
          });
        }

        /* Set latest state of all stores to scope */
        const allStates = getAllStoreStates(pinia, options.stateTransformer);
        const scope = getCurrentScope();
        const currentState = scope.getScopeData().contexts.state;

        if (typeof allStates !== 'undefined' && allStates !== null) {
          const client = getClient();
          const options = client?.getOptions();
          const normalizationDepth = options?.normalizeDepth || 3; // default state normalization depth to 3
          const piniaStateContext = { type: 'pinia', value: allStates };

          const newState = {
            ...(currentState || {}),
            state: piniaStateContext,
          };

          addNonEnumerableProperty(
            newState,
            '__sentry_override_normalization_depth__',
            3 + // 3 layers for `state.value.transformedState
              normalizationDepth, // rest for the actual state
          );

          scope.setContext('state', newState);
        } else {
          scope.setContext('state', {
            ...(currentState || {}),
            state: { type: 'pinia', value: 'undefined' },
          });
        }
      });
    });
  };

  return plugin;
};

export { createSentryPiniaPlugin };
//# sourceMappingURL=pinia.js.map
