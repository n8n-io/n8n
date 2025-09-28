import type { FakeResponseItem } from './types';

/**
 * Singleton response manager that cycles through predefined responses
 * and maintains state across multiple agent calls
 */
export class ResponseManager {
	private static instance: ResponseManager;
	private responses: FakeResponseItem[] = ['Default fake response'];
	private currentIndex = 0;

	private constructor() {}

	static getInstance(): ResponseManager {
		if (!ResponseManager.instance) {
			ResponseManager.instance = new ResponseManager();
		}
		return ResponseManager.instance;
	}

	/**
	 * Set the responses to cycle through
	 */
	setResponses(responses: FakeResponseItem[]): void {
		this.responses = responses.length > 0 ? responses : ['Default fake response'];
		this.currentIndex = 0;
	}

	/**
	 * Get the next response in the cycle
	 */
	getNextResponse(): FakeResponseItem {
		const response = this.responses[this.currentIndex];
		this.currentIndex = (this.currentIndex + 1) % this.responses.length;
		return response;
	}

	/**
	 * Reset the response index to start from the beginning
	 */
	reset(): void {
		this.currentIndex = 0;
	}

	/**
	 * Get current responses (for debugging/testing)
	 */
	getResponses(): FakeResponseItem[] {
		return [...this.responses];
	}
}
