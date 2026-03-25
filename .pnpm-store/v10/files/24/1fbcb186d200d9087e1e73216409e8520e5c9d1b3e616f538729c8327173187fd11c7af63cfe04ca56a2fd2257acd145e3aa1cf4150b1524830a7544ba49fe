import { createMiddleware } from "../middleware.js";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod/v3";
import { sha256 } from "@langchain/core/utils/hash";

//#region src/agents/middleware/pii.ts
/**
* Error thrown when PII is detected and strategy is 'block'
*/
var PIIDetectionError = class extends Error {
	constructor(piiType, matches) {
		super(`PII detected: ${piiType} found ${matches.length} occurrence(s)`);
		this.piiType = piiType;
		this.matches = matches;
		this.name = "PIIDetectionError";
	}
};
/**
* Email detection regex pattern
*/
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
/**
* Credit card detection regex pattern (basic, will be validated with Luhn)
*/
const CREDIT_CARD_PATTERN = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
/**
* IP address detection regex pattern
*/
const IP_PATTERN = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
/**
* MAC address detection regex pattern
*/
const MAC_ADDRESS_PATTERN = /\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/g;
/**
* URL detection regex pattern
*/
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;
/**
* Luhn algorithm for credit card validation
*/
function luhnCheck(cardNumber) {
	const digits = cardNumber.replace(/\D/g, "");
	let sum = 0;
	let isEven = false;
	for (let i = digits.length - 1; i >= 0; i--) {
		let digit = parseInt(digits[i], 10);
		if (isEven) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
		isEven = !isEven;
	}
	return sum % 10 === 0;
}
/**
* Convert regex match to PIIMatch
*/
function regexMatchToPIIMatch(match) {
	return {
		text: match[0],
		start: match.index ?? 0,
		end: (match.index ?? 0) + match[0].length
	};
}
/**
* Detect email addresses in content
*/
function detectEmail(content) {
	const matches = [];
	const regex = new RegExp(EMAIL_PATTERN);
	let match;
	while ((match = regex.exec(content)) !== null) matches.push(regexMatchToPIIMatch(match));
	return matches;
}
/**
* Detect credit card numbers in content (validated with Luhn algorithm)
*/
function detectCreditCard(content) {
	const matches = [];
	const regex = new RegExp(CREDIT_CARD_PATTERN);
	let match;
	while ((match = regex.exec(content)) !== null) {
		const cardNumber = match[0].replace(/\D/g, "");
		if (cardNumber.length >= 13 && cardNumber.length <= 19 && luhnCheck(cardNumber)) matches.push(regexMatchToPIIMatch(match));
	}
	return matches;
}
/**
* Detect IP addresses in content (validated)
*/
function detectIP(content) {
	const matches = [];
	const regex = new RegExp(IP_PATTERN);
	let match;
	while ((match = regex.exec(content)) !== null) {
		const parts = match[0].split(".");
		if (parts.length === 4 && parts.every((part) => {
			const num = parseInt(part, 10);
			return num >= 0 && num <= 255;
		})) matches.push(regexMatchToPIIMatch(match));
	}
	return matches;
}
/**
* Detect MAC addresses in content
*/
function detectMacAddress(content) {
	const matches = [];
	const regex = new RegExp(MAC_ADDRESS_PATTERN);
	let match;
	while ((match = regex.exec(content)) !== null) matches.push(regexMatchToPIIMatch(match));
	return matches;
}
/**
* Detect URLs in content
*/
function detectUrl(content) {
	const matches = [];
	const regex = new RegExp(URL_PATTERN);
	let match;
	while ((match = regex.exec(content)) !== null) matches.push(regexMatchToPIIMatch(match));
	return matches;
}
/**
* Built-in detector map
*/
const BUILT_IN_DETECTORS = {
	email: detectEmail,
	credit_card: detectCreditCard,
	ip: detectIP,
	mac_address: detectMacAddress,
	url: detectUrl
};
/**
* Resolve a redaction rule to a concrete detector function
*/
function resolveRedactionRule(config) {
	let detector;
	if (config.detector) if (typeof config.detector === "string") {
		const regex = new RegExp(config.detector, "g");
		detector = (content) => {
			const matches = [];
			let match;
			const regexCopy = new RegExp(regex);
			while ((match = regexCopy.exec(content)) !== null) matches.push(regexMatchToPIIMatch(match));
			return matches;
		};
	} else if (config.detector instanceof RegExp) detector = (content) => {
		if (!(config.detector instanceof RegExp)) throw new Error("Detector is required");
		const matches = [];
		let match;
		while ((match = config.detector.exec(content)) !== null) matches.push(regexMatchToPIIMatch(match));
		return matches;
	};
	else detector = config.detector;
	else {
		const builtInType = config.piiType;
		if (!BUILT_IN_DETECTORS[builtInType]) throw new Error(`Unknown PII type: ${config.piiType}. Must be one of: ${Object.keys(BUILT_IN_DETECTORS).join(", ")}, or provide a custom detector.`);
		detector = BUILT_IN_DETECTORS[builtInType];
	}
	return {
		piiType: config.piiType,
		strategy: config.strategy,
		detector
	};
}
/**
* Apply redact strategy: replace with [REDACTED_TYPE]
*/
function applyRedactStrategy(content, matches, piiType) {
	let result = content;
	for (let i = matches.length - 1; i >= 0; i--) {
		const match = matches[i];
		const replacement = `[REDACTED_${piiType.toUpperCase()}]`;
		result = result.slice(0, match.start) + replacement + result.slice(match.end);
	}
	return result;
}
/**
* Apply mask strategy: partially mask PII (show last few characters)
*/
function applyMaskStrategy(content, matches, piiType) {
	let result = content;
	for (let i = matches.length - 1; i >= 0; i--) {
		const match = matches[i];
		const text = match.text;
		let masked;
		if (piiType === "credit_card") masked = `****-****-****-${text.replace(/\D/g, "").slice(-4)}`;
		else if (piiType === "email") {
			const [local, domain] = text.split("@");
			if (local && domain) masked = `${local[0]}***@${domain}`;
			else masked = "***";
		} else {
			const visibleChars = Math.min(4, text.length);
			masked = `${"*".repeat(Math.max(0, text.length - visibleChars))}${text.slice(-visibleChars)}`;
		}
		result = result.slice(0, match.start) + masked + result.slice(match.end);
	}
	return result;
}
/**
* Apply hash strategy: replace with deterministic hash
*/
function applyHashStrategy(content, matches, piiType) {
	let result = content;
	for (let i = matches.length - 1; i >= 0; i--) {
		const match = matches[i];
		const replacement = `<${piiType}_hash:${sha256(match.text).slice(0, 8)}>`;
		result = result.slice(0, match.start) + replacement + result.slice(match.end);
	}
	return result;
}
/**
* Apply strategy to content based on matches
*/
function applyStrategy(content, matches, strategy, piiType) {
	if (matches.length === 0) return content;
	switch (strategy) {
		case "block": throw new PIIDetectionError(piiType, matches);
		case "redact": return applyRedactStrategy(content, matches, piiType);
		case "mask": return applyMaskStrategy(content, matches, piiType);
		case "hash": return applyHashStrategy(content, matches, piiType);
		default: throw new Error(`Unknown strategy: ${strategy}`);
	}
}
/**
* Configuration schema for PII middleware
*/
const contextSchema = z.object({
	applyToInput: z.boolean().optional(),
	applyToOutput: z.boolean().optional(),
	applyToToolResults: z.boolean().optional()
});
/**
* Process content for PII detection and apply strategy
*/
function processContent(content, rule) {
	const matches = rule.detector(content);
	if (matches.length === 0) return {
		content,
		matches: []
	};
	return {
		content: applyStrategy(content, matches, rule.strategy, rule.piiType),
		matches
	};
}
/**
* Creates a middleware that detects and handles personally identifiable information (PII)
* in conversations.
*
* This middleware detects common PII types and applies configurable strategies to handle them.
* It can detect emails, credit cards, IP addresses, MAC addresses, and URLs in both user input
* and agent output.
*
* Built-in PII types:
* - `email`: Email addresses
* - `credit_card`: Credit card numbers (validated with Luhn algorithm)
* - `ip`: IP addresses (validated)
* - `mac_address`: MAC addresses
* - `url`: URLs (both `http`/`https` and bare URLs)
*
* Strategies:
* - `block`: Raise an exception when PII is detected
* - `redact`: Replace PII with `[REDACTED_TYPE]` placeholders
* - `mask`: Partially mask PII (e.g., `****-****-****-1234` for credit card)
* - `hash`: Replace PII with deterministic hash (e.g., `<email_hash:a1b2c3d4>`)
*
* Strategy Selection Guide:
* | Strategy | Preserves Identity? | Best For                                |
* | -------- | ------------------- | --------------------------------------- |
* | `block`  | N/A                 | Avoid PII completely                    |
* | `redact` | No                  | General compliance, log sanitization    |
* | `mask`   | No                  | Human readability, customer service UIs |
* | `hash`   | Yes (pseudonymous)  | Analytics, debugging                    |
*
* @param piiType - Type of PII to detect. Can be a built-in type (`email`, `credit_card`, `ip`, `mac_address`, `url`) or a custom type name.
* @param options - Configuration options
* @param options.strategy - How to handle detected PII. Defaults to `"redact"`.
* @param options.detector - Custom detector function or regex pattern string. If not provided, uses built-in detector for the `piiType`.
* @param options.applyToInput - Whether to check user messages before model call. Defaults to `true`.
* @param options.applyToOutput - Whether to check AI messages after model call. Defaults to `false`.
* @param options.applyToToolResults - Whether to check tool result messages after tool execution. Defaults to `false`.
*
* @returns Middleware instance for use with `createAgent`
*
* @throws {PIIDetectionError} When PII is detected and strategy is `'block'`
* @throws {Error} If `piiType` is not built-in and no detector is provided
*
* @example Basic usage
* ```typescript
* import { piiMiddleware } from "langchain";
* import { createAgent } from "langchain";
*
* // Redact all emails in user input
* const agent = createAgent({
*   model: "openai:gpt-4",
*   middleware: [
*     piiMiddleware("email", { strategy: "redact" }),
*   ],
* });
* ```
*
* @example Different strategies for different PII types
* ```typescript
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   middleware: [
*     piiMiddleware("credit_card", { strategy: "mask" }),
*     piiMiddleware("url", { strategy: "redact" }),
*     piiMiddleware("ip", { strategy: "hash" }),
*   ],
* });
* ```
*
* @example Custom PII type with regex
* ```typescript
* const agent = createAgent({
*   model: "openai:gpt-4",
*   middleware: [
*     piiMiddleware("api_key", {
*       detector: "sk-[a-zA-Z0-9]{32}",
*       strategy: "block",
*     }),
*   ],
* });
* ```
*
* @public
*/
function piiMiddleware(piiType, options = {}) {
	const { strategy = "redact", detector } = options;
	const resolvedRule = resolveRedactionRule({
		piiType,
		strategy,
		detector
	});
	return createMiddleware({
		name: `PIIMiddleware[${resolvedRule.piiType}]`,
		contextSchema,
		beforeModel: async (state, runtime) => {
			const applyToInput = runtime.context.applyToInput ?? options.applyToInput ?? true;
			const applyToToolResults = runtime.context.applyToToolResults ?? options.applyToToolResults ?? false;
			if (!applyToInput && !applyToToolResults) return;
			const messages = state.messages;
			if (!messages || messages.length === 0) return;
			const newMessages = [...messages];
			let anyModified = false;
			if (applyToInput) {
				let lastUserIdx = null;
				for (let i = messages.length - 1; i >= 0; i--) if (HumanMessage.isInstance(messages[i])) {
					lastUserIdx = i;
					break;
				}
				if (lastUserIdx !== null) {
					const lastUserMsg = messages[lastUserIdx];
					if (lastUserMsg && lastUserMsg.content) {
						const { content: newContent, matches } = processContent(String(lastUserMsg.content), resolvedRule);
						if (matches.length > 0) {
							newMessages[lastUserIdx] = new HumanMessage({
								content: newContent,
								id: lastUserMsg.id,
								name: lastUserMsg.name
							});
							anyModified = true;
						}
					}
				}
			}
			if (applyToToolResults) {
				let lastAiIdx = null;
				for (let i = messages.length - 1; i >= 0; i--) if (AIMessage.isInstance(messages[i])) {
					lastAiIdx = i;
					break;
				}
				if (lastAiIdx !== null) for (let i = lastAiIdx + 1; i < messages.length; i++) {
					const msg = messages[i];
					if (ToolMessage.isInstance(msg)) {
						if (!msg.content) continue;
						const { content: newContent, matches } = processContent(String(msg.content), resolvedRule);
						if (matches.length > 0) {
							newMessages[i] = new ToolMessage({
								content: newContent,
								id: msg.id,
								name: msg.name,
								tool_call_id: msg.tool_call_id
							});
							anyModified = true;
						}
					}
				}
			}
			if (anyModified) return { messages: newMessages };
		},
		afterModel: async (state, runtime) => {
			if (!(runtime.context.applyToOutput ?? options.applyToOutput ?? false)) return;
			const messages = state.messages;
			if (!messages || messages.length === 0) return;
			let lastAiIdx = null;
			let lastAiMsg = null;
			for (let i = messages.length - 1; i >= 0; i--) {
				const msg = messages[i];
				if (AIMessage.isInstance(msg)) {
					lastAiMsg = msg;
					lastAiIdx = i;
					break;
				}
			}
			if (lastAiIdx === null || !lastAiMsg || !lastAiMsg.content) return;
			const { content: newContent, matches } = processContent(String(lastAiMsg.content), resolvedRule);
			if (matches.length === 0) return;
			const updatedMessage = new AIMessage({
				content: newContent,
				id: lastAiMsg.id,
				name: lastAiMsg.name,
				tool_calls: lastAiMsg.tool_calls
			});
			const newMessages = [...messages];
			newMessages[lastAiIdx] = updatedMessage;
			return { messages: newMessages };
		}
	});
}

//#endregion
export { PIIDetectionError, applyStrategy, detectCreditCard, detectEmail, detectIP, detectMacAddress, detectUrl, piiMiddleware, resolveRedactionRule };
//# sourceMappingURL=pii.js.map