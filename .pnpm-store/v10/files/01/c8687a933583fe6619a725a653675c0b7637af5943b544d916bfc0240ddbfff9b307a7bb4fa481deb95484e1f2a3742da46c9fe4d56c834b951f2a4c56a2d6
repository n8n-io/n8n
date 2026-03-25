import type { ChatCompletionInputMessage, GenerationParameters } from "../tasks/index.js";

export function stringifyMessages(
	messages: ChatCompletionInputMessage[],
	opts?: {
		indent?: string;
		attributeKeyQuotes?: boolean;
		customContentEscaper?: (str: string) => string;
	}
): string {
	let messagesStr = JSON.stringify(messages, null, "\t");
	if (opts?.indent) {
		messagesStr = messagesStr.replaceAll("\n", `\n${opts.indent}`);
	}
	if (!opts?.attributeKeyQuotes) {
		messagesStr = messagesStr.replace(/"([^"]+)":/g, "$1:");
	}
	if (opts?.customContentEscaper) {
		messagesStr = opts.customContentEscaper(messagesStr);
	}
	return messagesStr;
}

type PartialGenerationParameters = Partial<Pick<GenerationParameters, "temperature" | "max_tokens" | "top_p">>;

export function stringifyGenerationConfig(
	config: PartialGenerationParameters,
	opts: {
		indent: string;
		attributeValueConnector: string;
		attributeKeyQuotes?: boolean;
	}
): string {
	const quote = opts.attributeKeyQuotes ? `"` : "";

	return Object.entries(config)
		.map(([key, val]) => `${quote}${key}${quote}${opts.attributeValueConnector}${val},`)
		.join(`${opts.indent}`);
}
