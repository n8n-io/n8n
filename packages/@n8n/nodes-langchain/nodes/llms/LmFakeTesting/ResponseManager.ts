import { AIMessageChunk } from '@langchain/core/messages';

/**
 * Simple sequential response manager
 *
 * Manages a list of AI messages and provides sequential access to them,
 * cycling through the responses when the end is reached.
 */
export class ResponseManager {
	private responses: AIMessageChunk[];

	constructor(responses: AIMessageChunk[]) {
		this.responses = responses;
		this.responses.reverse();
	}

	/**
	 * Get the next response in the sequence
	 * Cycles back to the beginning when all responses have been used
	 */
	getNextResponse(): AIMessageChunk {
		if (this.responses.length === 0) {
			return new AIMessageChunk({ content: 'No responses configured' });
		}

		const response = this.responses.pop();
		if (!response) {
			return new AIMessageChunk({ content: 'No more responses available' });
		}
		return response;
	}
}
