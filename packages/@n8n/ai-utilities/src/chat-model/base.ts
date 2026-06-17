import type { ChatModel, ChatModelConfig } from 'src/types/chat-model';
import type { Message } from 'src/types/message';
import type { GenerateResult, StreamChunk } from 'src/types/output';
import type { Tool } from 'src/types/tool';

export abstract class BaseChatModel<TConfig extends ChatModelConfig = ChatModelConfig>
	implements ChatModel<TConfig>
{
	constructor(
		public provider: string,
		public modelId: string,
		public defaultConfig?: TConfig,
		protected tools: Tool[] = [],
	) {}

	abstract generate(messages: Message[], config?: TConfig): Promise<GenerateResult>;

	abstract stream(messages: Message[], config?: TConfig): AsyncIterable<StreamChunk>;

	/**
	 * Bind tools to the model. Returns a new instance with tools attached.
	 * Subclasses should override this to return their own type if needed.
	 */
	withTools(tools: Tool[]): ChatModel<TConfig> {
		// Create a shallow copy with new tools
		const newInstance = Object.create(Object.getPrototypeOf(this) as object);
		Object.assign(newInstance, this);
		newInstance.tools = [...this.tools, ...tools];
		return newInstance;
	}

	/**
	 * Merge configuration with defaults
	 */
	protected mergeConfig(config?: TConfig): ChatModelConfig {
		return {
			...this.defaultConfig,
			...config,
		};
	}
}
