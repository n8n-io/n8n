export interface AiGatewayWalletResponse {
	budget: number;
	balance: number;
	/** True after the user has added paid credits at least once. */
	hasEverToppedUp: boolean;
}
