// Shell files import this entry at boot, so keep it light: constants, the event bus and lazy
// component loaders. A direct `.vue` export would put that component in the boot chunk.
// The descriptor has its own subpath, so importing a constant does not load the routes.
export { ENVIRONMENTS_UPGRADE_DOCS_URL, PROMOTIONS_SETTINGS_VIEW } from './promotions.constants';
export { promotionEventBus } from './promotions.eventBus';

export const loadPromotionPreviewBadges = async () =>
	await import('./components/PromotionPreviewBadges.vue');

export const loadPromotionReviewChanges = async () =>
	await import('./components/review/PromotionReviewChanges.vue');
