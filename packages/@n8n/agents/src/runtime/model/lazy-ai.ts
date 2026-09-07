import type * as AiSdk from 'ai';

let _aiMod: typeof AiSdk | undefined;

export function loadAi(): typeof AiSdk {
	if (!_aiMod) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('ai') as typeof AiSdk;
		_aiMod = mod;
	}
	return _aiMod;
}
