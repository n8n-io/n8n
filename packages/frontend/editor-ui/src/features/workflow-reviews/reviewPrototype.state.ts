import { reactive } from 'vue';

/**
 * Review choices for the prototype. They stay in this module so the Policies
 * page and the project page read the same switches.
 */
export const reviewPrototypeState = reactive({
	/** Set once the Policies page has published its current switches. */
	initialized: false,
	workflowReviewsEnabled: false,
	promotionReviewsEnabled: false,
	publishingNeedsApproval: false,
	promotingNeedsApproval: false,
	projectPublishing: false,
	projectPromoting: false,
	workflowPublishing: {} as Record<string, boolean>,
	workflowPromoting: {} as Record<string, boolean>,
});
