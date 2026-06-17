export type BuilderCreditsPushMessage = {
	type: 'updateBuilderCredits';
	data: {
		creditsQuota: number;
		creditsClaimed: number;
	};
};
