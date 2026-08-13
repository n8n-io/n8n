import {
	MOONSHOTAI_KIMI_K3_MODEL_ID,
	MOONSHOTAI_KIMI_K3_MODEL_NAME,
	MOONSHOTAI_KIMI_K3_PROVIDER,
	isMoonshotaiKimiK3ModelId,
} from '../constants/instance-ai-models';

describe('MOONSHOTAI_KIMI_K3_MODEL_ID', () => {
	it('is the composed provider/model id', () => {
		expect(MOONSHOTAI_KIMI_K3_MODEL_ID).toBe('moonshotai/kimi-k3');
		expect(MOONSHOTAI_KIMI_K3_MODEL_ID).toBe(
			`${MOONSHOTAI_KIMI_K3_PROVIDER}/${MOONSHOTAI_KIMI_K3_MODEL_NAME}`,
		);
	});

	it('matches only the exact model id', () => {
		expect(isMoonshotaiKimiK3ModelId(MOONSHOTAI_KIMI_K3_MODEL_ID)).toBe(true);
		expect(isMoonshotaiKimiK3ModelId('moonshotai/kimi-k2')).toBe(false);
		expect(isMoonshotaiKimiK3ModelId('custom/moonshotai/kimi-k3')).toBe(false);
		expect(isMoonshotaiKimiK3ModelId('anthropic/claude-opus-5')).toBe(false);
	});
});
