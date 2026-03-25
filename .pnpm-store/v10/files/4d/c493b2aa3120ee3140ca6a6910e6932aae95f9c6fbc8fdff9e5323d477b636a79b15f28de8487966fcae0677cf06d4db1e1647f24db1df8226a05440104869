import { getCurrentInstance, inject, computed, unref } from 'vue';
import '../../utils/index.mjs';
import { useGetDerivedNamespace } from '../use-namespace/index.mjs';
import { isClient } from '@vueuse/core';
import { debugWarn } from '../../utils/error.mjs';

const defaultIdInjection = {
  prefix: Math.floor(Math.random() * 1e4),
  current: 0
};
const ID_INJECTION_KEY = Symbol("elIdInjection");
const useIdInjection = () => {
  return getCurrentInstance() ? inject(ID_INJECTION_KEY, defaultIdInjection) : defaultIdInjection;
};
const useId = (deterministicId) => {
  const idInjection = useIdInjection();
  if (!isClient && idInjection === defaultIdInjection) {
    debugWarn("IdInjection", `Looks like you are using server rendering, you must provide a id provider to ensure the hydration process to be succeed
usage: app.provide(ID_INJECTION_KEY, {
  prefix: number,
  current: number,
})`);
  }
  const namespace = useGetDerivedNamespace();
  const idRef = computed(() => unref(deterministicId) || `${namespace.value}-id-${idInjection.prefix}-${idInjection.current++}`);
  return idRef;
};

export { ID_INJECTION_KEY, useId, useIdInjection };
//# sourceMappingURL=index.mjs.map
