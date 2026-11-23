// The module's only public entry. Shell files import it at boot, so it exports
// the descriptor and lazy component loaders only.
export { AgentDeterminismModule } from './agent-determinism.module';

export const loadDeterminismCallout = async () =>
	await import('./components/DeterminismCallout.vue');

export const loadGeneratedDraftBanner = async () =>
	await import('./components/GeneratedDraftBanner.vue');

export const loadDeterminismBadge = async () => await import('./components/DeterminismBadge.vue');
