// The module's public entry for consumers: the store and the summary widget the
// shell renders on its list views.
//
// The descriptor is deliberately NOT here. It has its own entry
// (`@n8n/frontend-module-insights/insights.module`) because `modules.manifest.ts`
// imports it eagerly at boot, while `InsightsSummary` is an SFC. One entry holding
// both makes the SFC statically reachable from the boot chunk — measured at +2 boot
// assets including a render-blocking stylesheet. Two entries keep the boot path free
// of component code, which is the whole point of a lazily-rendered module.
export { useInsightsStore } from './insights.store';
export { default as InsightsSummary } from './components/InsightsSummary.vue';
