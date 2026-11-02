// The module's only public entry. The shell imports it at boot through `router.ts` and
// `modules.manifest.ts`, so keep it light: constants, the event bus, the descriptor and lazy
// component loaders. A direct `.vue` export would put that component in the boot chunk.
export { PromotionsModule } from './promotions.module';
export { ENVIRONMENTS_UPGRADE_DOCS_URL, PROMOTIONS_SETTINGS_VIEW } from './promotions.constants';
export { promotionEventBus, type PromotionEventBusEvents } from './promotions.eventBus';

export const loadPromotionPreviewBadges = async () =>
	await import('./components/PromotionPreviewBadges.vue');

export const loadPromotionReviewChanges = async () =>
	await import('./components/review/PromotionReviewChanges.vue');
