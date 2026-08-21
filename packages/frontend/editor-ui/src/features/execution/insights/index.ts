/**
 * The feature's only public entry. Consumers outside `features/execution/insights`
 * import from here — deep paths into the feature are not part of the contract.
 * Every symbol added here becomes package API when the feature moves to
 * `@n8n/frontend-module-insights`, so keep the surface minimal.
 *
 * Paths are relative on purpose: this file survives the move unchanged.
 */
export { useInsightsStore } from './insights.store';
export { default as InsightsSummary } from './components/InsightsSummary.vue';
