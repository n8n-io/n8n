import type { AIMessageChunk } from '@langchain/core/messages';
import { FakeChatModel, FakeListChatModelCallOptions } from '@langchain/core/utils/testing';

import { ResponseManager } from './ResponseManager';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

/**
 * Clean FakeStreamingChatModel that handles sequential responses
 *
 * Extends LangChain's FakeStreamingChatModel to support cycling through
 * multiple responses in sequence. Handles tool binding properly by
 * returning a proxy that intercepts invoke calls while maintaining
 * all LangChain functionality.
 */
export class SequentialFakeStreamingChatModel extends FakeChatModel {
	private responseManager: ResponseManager;
	callbacks: BaseCallbackHandler[];

	constructor(responses: AIMessageChunk[], callbacks?: BaseCallbackHandler[]) {
		super({});
		this.callbacks = callbacks || [];
		this.responseManager = new ResponseManager(responses);
	}

	async invoke(
		messages: BaseLanguageModelInput,
		_options?: FakeListChatModelCallOptions | undefined,
	): Promise<AIMessageChunk> {
		// trigger callback handlers manually for proper tracing
		const runid = Math.random().toString(36).substring(7);

		// simulate handlellmstart
		if (this.callbacks) {
			for (const currentCallback of this.callbacks) {
				if (typeof currentCallback.handleLLMStart === 'function') {
					try {
						// convert messages to string array format expected by handlellmstart
						let messagestrings: string[];
						if (Array.isArray(messages)) {
							messagestrings = messages.map((m) => {
								if (typeof m === 'string') {
									return m;
								} else if (m && typeof (m as any).content === 'string') {
									return (m as any).content;
								} else if (m && typeof (m as any).toString === 'function') {
									return (m as any).toString();
								} else {
									return String(m);
								}
							});
						} else if (typeof messages === 'string') {
							messagestrings = [messages];
						} else if (messages && typeof (messages as any).content === 'string') {
							messagestrings = [(messages as any).content];
						} else {
							messagestrings = [String(messages)];
						}

						await currentCallback.handleLLMStart(
							{ type: 'constructor', kwargs: {}, lc: 0, id: [''] },
							messagestrings,
							runid,
						);
					} catch (error) {
						console.warn('error in handlellmstart:', error);
					}
				}
			}
		}

		// get the response
		const response = this.responseManager.getNextResponse();

		// simulate handlellmend
		if (this.callbacks) {
			for (const currentCallback of this.callbacks) {
				if (typeof currentCallback.handleLLMEnd === 'function') {
					try {
						await currentCallback.handleLLMEnd(
							{
								generations: [[{ text: (response.content as string) || '', generationInfo: {} }]],
								llmOutput: {},
							},
							runid,
						);
					} catch (error) {
						console.warn('error in handlellmend:', error);
					}
				}
			}
		}

		return response;
	}
	/**
	 * Handle tool binding by returning a proxy that intercepts invoke calls
	 *
	 * This is the key method that makes sequential responses work with agents.
	 * It creates a proxy that uses our sequential logic for invoke calls while
	 * delegating all other functionality to the properly bound LangChain instance.
	 */
	bindTools(_tools: any[], _options?: any): any {
		// Get the properly bound instance from LangChain
		return this;

		// copy callbacks from the original instance to the bound instance
		// if (this.callbacks && this.callbacks.length > 0) {
		// 	boundinstance.callbacks = [...this.callbacks];
		// }
		//
		// // create a simple wrapper that uses our response logic for invoke calls
		// const responsemanager = this.responsemanager;
		//
		// return new proxy(boundinstance, {
		// 	get(target, prop, receiver) {
		// 		if (prop === 'invoke') {
		// 			return async function (messages: basemessage[], options?: any): promise<aimessage> {
		// 				// trigger callback handlers manually for proper tracing
		// 				const runid = math.random().tostring(36).substring(7);
		//
		// 				// simulate handlellmstart
		// 				if (boundinstance.callbacks) {
		// 					for (const callback of boundinstance.callbacks) {
		// 						if (typeof callback.handlellmstart === 'function') {
		// 							try {
		// 								// convert messages to string array format expected by handlellmstart
		// 								const messagestrings = array.isarray(messages)
		// 									? messages.map(m => typeof m === 'string' ? m : (m.content || ''))
		// 									: [typeof messages === 'string' ? messages : (messages.content || '')];
		//
		// 								await callback.handlellmstart(
		// 									{ type: 'constructor', kwargs: {} },
		// 									messagestrings,
		// 									runid
		// 								);
		// 							} catch (error) {
		// 								console.warn(`error in handlellmstart:`, error);
		// 							}
		// 						}
		// 					}
		// 				}
		//
		// 				// get the response
		// 				const response = responsemanager.getnextresponse();
		//
		// 				// simulate handlellmend
		// 				if (boundinstance.callbacks) {
		// 					for (const callback of boundinstance.callbacks) {
		// 						if (typeof callback.handlellmend === 'function') {
		// 							try {
		// 								await callback.handlellmend(
		// 									{
		// 										generations: [[{ text: response.content || '', generationinfo: {} }]],
		// 										llmoutput: {}
		// 									},
		// 									runid
		// 								);
		// 							} catch (error) {
		// 								console.warn(`error in handlellmend:`, error);
		// 							}
		// 						}
		// 					}
		// 				}
		//
		// 				return response;
		// 			};
		// 		}
		//
		// 		// for everything else, use the bound instance
		// 		return reflect.get(target, prop, receiver);
		// 	},
		// });
	}
}
