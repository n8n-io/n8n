export const LLM_PRICING_INFORMATION = {
	// gpt‑3.5‑turbo line
	'gpt-3.5-turbo-0125': { Input: 0.0000005, Output: 0.0000015 },
	'gpt-3.5-turbo': { Input: 0.0000005, Output: 0.0000015 },

	// legacy “instruct” and 16k variants
	'gpt-3.5-turbo-instruct': { Input: 0.0000015, Output: 0.000002 },
	'gpt-3.5-turbo-16k-0613': { Input: 0.000003, Output: 0.000004 },

	// the new 4o model
	'chatgpt-4o-latest': { Input: 0.000005, Output: 0.000015 },

	// gpt‑4‑turbo
	'gpt-4-turbo-2024-04-09': { Input: 0.00001, Output: 0.00003 },
	'gpt-4-turbo': { Input: 0.00001, Output: 0.00003 },

	// base GPT‑4
	'gpt-4-0613': { Input: 0.00003, Output: 0.00006 },
	'gpt-4': { Input: 0.00003, Output: 0.00006 },

	// 32k‑token window
	'gpt-4-32k': { Input: 0.00006, Output: 0.00012 },

	// older “classic” models
	'davinci-002': { Input: 0.000002, Output: 0.000002 },
	'babbage-002': { Input: 0.0000004, Output: 0.0000004 },

	// ────────────────────────────────────────────────────────────────
	// “o” & next‑gen GPT‑4.x family
	// ────────────────────────────────────────────────────────────────

	// gpt‑4.1
	'gpt-4.1-2025-04-14': { Input: 0.000002, Output: 0.000008 },
	'gpt-4.1': { Input: 0.000002, Output: 0.000008 },

	// gpt‑4.1‑mini
	'gpt-4.1-mini-2025-04-14': { Input: 0.0000004, Output: 0.0000016 },
	'gpt-4.1-mini': { Input: 0.0000004, Output: 0.0000016 },

	// gpt‑4.1‑nano
	'gpt-4.1-nano-2025-04-14': { Input: 0.0000001, Output: 0.0000004 },
	'gpt-4.1-nano': { Input: 0.0000001, Output: 0.0000004 },

	// gpt‑4.5‑preview
	'gpt-4.5-preview-2025-02-27': { Input: 0.000075, Output: 0.00015 },
	'gpt-4.5-preview': { Input: 0.000075, Output: 0.00015 },

	// gpt‑4o (alias for chatgpt‑4o-latest)
	'gpt-4o-2024-08-06': { Input: 0.0000025, Output: 0.00001 },
	'gpt-4o': { Input: 0.0000025, Output: 0.00001 },

	// gpt‑4o‑audio‑preview
	'gpt-4o-audio-preview-2024-12-17': { Input: 0.0000025, Output: 0.00001 },
	'gpt-4o-audio-preview': { Input: 0.0000025, Output: 0.00001 },

	// gpt‑4o‑realtime‑preview
	'gpt-4o-realtime-preview-2024-12-17': { Input: 0.000005, Output: 0.00002 },
	'gpt-4o-realtime-preview': { Input: 0.000005, Output: 0.00002 },

	// gpt‑4o‑mini
	'gpt-4o-mini-2024-07-18': { Input: 0.00000015, Output: 0.0000006 },
	'gpt-4o-mini': { Input: 0.00000015, Output: 0.0000006 },

	// gpt‑4o‑mini‑audio‑preview
	'gpt-4o-mini-audio-preview-2024-12-17': { Input: 0.00000015, Output: 0.0000006 },
	'gpt-4o-mini-audio-preview': { Input: 0.00000015, Output: 0.0000006 },

	// gpt‑4o‑mini‑realtime‑preview
	'gpt-4o-mini-realtime-preview-2024-12-17': { Input: 0.0000006, Output: 0.0000024 },
	'gpt-4o-mini-realtime-preview': { Input: 0.0000006, Output: 0.0000024 },

	// gpt‑4o‑mini‑search‑preview
	'gpt-4o-mini-search-preview-2025-03-11': { Input: 0.00000015, Output: 0.0000006 },
	'gpt-4o-mini-search-preview': { Input: 0.00000015, Output: 0.0000006 },

	// gpt‑4o‑search‑preview
	'gpt-4o-search-preview-2025-03-11': { Input: 0.0000025, Output: 0.00001 },
	'gpt-4o-search-preview': { Input: 0.0000025, Output: 0.00001 },

	// computer‑use‑preview
	'computer-use-preview-2025-03-11': { Input: 0.000003, Output: 0.000012 },
	'computer-use-preview': { Input: 0.000003, Output: 0.000012 },

	// o‑series (“o1”, “o3”, etc.)
	'o1-2024-12-17': { Input: 0.000015, Output: 0.00006 },
	o1: { Input: 0.000015, Output: 0.00006 },

	'o1-pro-2025-03-19': { Input: 0.00015, Output: 0.0006 },
	'o1-pro': { Input: 0.00015, Output: 0.0006 },

	'o1-mini-2024-09-12': { Input: 0.0000011, Output: 0.0000044 },
	'o1-mini': { Input: 0.0000011, Output: 0.0000044 },

	'o3-2025-04-16': { Input: 0.000002, Output: 0.000008 },
	o3: { Input: 0.000002, Output: 0.000008 },

	'o3-pro-2025-06-10': { Input: 0.00002, Output: 0.00008 },
	'o3-pro': { Input: 0.00002, Output: 0.00008 },

	'o3-mini-2025-01-31': { Input: 0.0000011, Output: 0.0000044 },
	'o3-mini': { Input: 0.0000011, Output: 0.0000044 },

	// o4‑mini
	'o4-mini-2025-04-16': { Input: 0.0000011, Output: 0.0000044 },
	'o4-mini': { Input: 0.0000011, Output: 0.0000044 },

	// codex-mini
	'codex-mini-latest': { Input: 0.0000015, Output: 0.000006 },

	// google gemini models
	'gemini-1.5-flash': { Input: 0.000000075, Output: 0.0000003 },
};
