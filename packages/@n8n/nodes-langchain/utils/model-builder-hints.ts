// Model examples guide selection. The connected credential determines availability.
export const MODEL_SELECTION_HINT =
	'Choose a model supported by this node version, the configured API, and the required operation. Use the declared model-list lookup with the connected credential when available. Gateway credits can restrict that list. Live availability takes precedence over examples and node defaults. Keep a working or explicitly requested model unless provider evidence shows it is unavailable or unsuitable. Prefer stable models that fit the task and budget. Do not invent model IDs or treat an unfamiliar model as invalid.';

export const OPENAI_CHAT_MODEL_HINT =
	'Consider gpt-5.6-terra for balanced tasks or gpt-5.6-luna for low-cost tasks. ' +
	MODEL_SELECTION_HINT;

export const GEMINI_CHAT_MODEL_HINT =
	'Consider models/gemini-3.8-flash for general tasks or models/gemini-3.5-flash-lite for low-cost tasks. ' +
	MODEL_SELECTION_HINT;
