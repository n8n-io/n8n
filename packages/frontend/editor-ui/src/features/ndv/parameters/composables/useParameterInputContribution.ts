import { computed, defineAsyncComponent, type Component, type Ref } from 'vue';
import type { NodePropertyTypes } from 'n8n-workflow';
import { parameterInputRegistry } from '@n8n/frontend-module-sdk';
import type { ParameterInputCapabilities } from '@n8n/frontend-module-sdk';

import { isResourceLocatorParameterType } from '@/features/ndv/shared/ndv.utils';
import ParameterInputLoadError from '../components/ParameterInputLoadError.vue';
import ParameterInputLoading from '../components/ParameterInputLoading.vue';

type ResolvedCapabilities = Required<ParameterInputCapabilities>;

/**
 * One extra attempt covers a dropped request. Beyond that the chunk is gone
 * rather than late — a stale hashed filename after a rolling deploy — and
 * retrying only repeats the 404.
 */
const LOAD_RETRY_LIMIT = 1;

/** A loader that never settles would keep the placeholder up forever. */
const LOAD_TIMEOUT_MS = 30_000;

/**
 * `defineAsyncComponent` wrappers, kept per factory. A fresh wrapper on every
 * computed re-evaluation would remount the input on unrelated state changes.
 */
const asyncComponentCache = new WeakMap<() => Promise<Component>, Component>();

function resolveComponent(component: Component | (() => Promise<Component>)): Component {
	if (typeof component !== 'function') return component;

	const factory = component as () => Promise<Component>;
	let resolved = asyncComponentCache.get(factory);
	if (!resolved) {
		resolved = defineAsyncComponent({
			loader: factory,
			loadingComponent: ParameterInputLoading,
			errorComponent: ParameterInputLoadError,
			timeout: LOAD_TIMEOUT_MS,
			onError(error, retry, fail, attempts) {
				if (attempts <= LOAD_RETRY_LIMIT) {
					retry();
					return;
				}

				// Not reported to Sentry: `app/plugins/sentry.ts` drops dynamic-import
				// failures on purpose, because a stale chunk is expected after a deploy.
				console.error('Failed to load a contributed parameter input', error);
				fail();
			},
		});
		asyncComponentCache.set(factory, resolved);
	}

	return resolved;
}

/**
 * Resolves a module-contributed input for `parameter.type`, and the capabilities the
 * surrounding components must hand over to it.
 *
 * The built-in resource-locator family reports the same capabilities it behaves with
 * today, so a type that no module claims keeps its current behaviour. That is
 * also what keeps this correct while the family is moving into a module: the
 * flags are keyed on the type, not on who renders it.
 */
export function useParameterInputContribution(type: Ref<NodePropertyTypes>) {
	const contribution = computed(() => parameterInputRegistry.get(type.value));

	const contributedComponent = computed(() =>
		contribution.value ? resolveComponent(contribution.value.component) : undefined,
	);

	const capabilities = computed<ResolvedCapabilities>(() => {
		const declared = contribution.value?.capabilities;
		const isBuiltInResourceLocator = isResourceLocatorParameterType(type.value);

		return {
			ownsExpressionRendering:
				isBuiltInResourceLocator || declared?.ownsExpressionRendering === true,
			ownsFromAiOverride: isBuiltInResourceLocator || declared?.ownsFromAiOverride === true,
			disableDrop: isBuiltInResourceLocator || declared?.disableDrop === true,
		};
	});

	return { contribution, contributedComponent, capabilities };
}
