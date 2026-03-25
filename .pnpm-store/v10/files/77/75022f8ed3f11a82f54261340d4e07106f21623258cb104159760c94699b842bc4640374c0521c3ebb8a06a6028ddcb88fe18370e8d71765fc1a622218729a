import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

//#region src/chat_models/arcjet.ts
var arcjet_exports = {};
__export(arcjet_exports, { ArcjetRedact: () => ArcjetRedact });
async function transformTextMessageAsync(message, transformer) {
	if (typeof message.content === "string") {
		message.content = await transformer(message.content);
		return message;
	}
	const redactedContent = await Promise.all(message.content.map(async (m) => {
		if (m.type === "text") return {
			...m,
			text: await transformer(m.text)
		};
		else return Promise.resolve(m);
	}));
	message.content = redactedContent;
	return message;
}
function transformTextMessage(message, transformer) {
	if (typeof message.content === "string") {
		message.content = transformer(message.content);
		return message;
	}
	const redactedContent = message.content.map((m) => {
		if (m.type === "text") return {
			...m,
			text: transformer(m.text)
		};
		else return m;
	});
	message.content = redactedContent;
	return message;
}
var ArcjetRedact = class extends BaseChatModel {
	static lc_name() {
		return "ArcjetRedact";
	}
	chatModel;
	entities;
	contextWindowSize;
	detect;
	replace;
	index;
	constructor(options) {
		super(options);
		if (options.entities && options.entities.length === 0) throw new Error("no entities configured for redaction");
		this.chatModel = options.chatModel;
		this.entities = options.entities;
		this.contextWindowSize = options.contextWindowSize;
		this.detect = options.detect;
		this.replace = options.replace;
		this.index = 0;
	}
	_createUniqueReplacement(entity) {
		const userReplacement = typeof this.replace !== "undefined" ? this.replace(entity) : void 0;
		if (typeof userReplacement !== "undefined") return userReplacement;
		this.index++;
		if (entity === "email") return `<Redacted email #${this.index}>`;
		if (entity === "phone-number") return `<Redacted phone number #${this.index}>`;
		if (entity === "ip-address") return `<Redacted IP address #${this.index}>`;
		if (entity === "credit-card-number") return `<Redacted credit card number #${this.index}>`;
		return `<Redacted ${entity} #${this.index}>`;
	}
	_llmType() {
		return "arcjet_redact";
	}
	async _generate(messages, options, runManager) {
		const ajOptions = {
			entities: this.entities,
			contextWindowSize: this.contextWindowSize,
			detect: this.detect,
			replace: this._createUniqueReplacement.bind(this)
		};
		const unredactors = [];
		const { redact } = await import("@arcjet/redact");
		const redacted = await Promise.all(messages.map(async (message) => {
			return await transformTextMessageAsync(message, async (message$1) => {
				const [redacted$1, unredact] = await redact(message$1, ajOptions);
				unredactors.push(unredact);
				return redacted$1;
			});
		}));
		const response = await this.chatModel._generate(redacted, options, runManager);
		return {
			...response,
			generations: response.generations.map((resp) => {
				return {
					...resp,
					message: transformTextMessage(resp.message, (message) => {
						for (const unredact of unredactors) message = unredact(message);
						return message;
					})
				};
			})
		};
	}
};

//#endregion
export { ArcjetRedact, arcjet_exports };
//# sourceMappingURL=arcjet.js.map