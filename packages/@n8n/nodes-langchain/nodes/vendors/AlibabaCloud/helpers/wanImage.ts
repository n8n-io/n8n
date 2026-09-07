const MULTIMODAL_ENDPOINT = '/api/v1/services/aigc/multimodal-generation/generation';
const IMAGE_GENERATION_ENDPOINT = '/api/v1/services/aigc/image-generation/generation';
const TEXT2IMAGE_ENDPOINT = '/api/v1/services/aigc/text2image/image-synthesis';
const IMAGE2IMAGE_ENDPOINT = '/api/v1/services/aigc/image2image/image-synthesis';

const SIZE_2_5_PLUS = '1280*1280';
const SIZE_2_2_AND_EARLIER = '1024*1024';

export type WanImagePlan = {
	endpoint: string;
	async: boolean;
	input: 'messages' | 'prompt';
	attachImages: 'content' | 'input' | null;
	defaultSize: string | null;
	n: number | null;
	refs: { max: number; required: boolean } | null;
};

const SYNC_MULTIMODAL_PLAN: WanImagePlan = {
	endpoint: MULTIMODAL_ENDPOINT,
	async: false,
	input: 'messages',
	attachImages: null,
	defaultSize: null,
	n: null,
	refs: null,
};

function normalizeModelId(model: string): string {
	return model.trim().toLowerCase();
}

function isWanVideoModel(id: string): boolean {
	return /(?:^|-)(t2v|i2v)(?:-|$)/.test(id);
}

function parseWanVersion(id: string): { major: number; minor: number } | null {
	if (id === 'wanx-v1' || id.startsWith('wanx-v1-')) {
		return { major: 1, minor: 0 };
	}

	const match = /^wanx?(\d+)\.(\d+)/.exec(id);
	if (!match) {
		return null;
	}

	return { major: Number(match[1]), minor: Number(match[2]) };
}

function defaultSizeForVersion(version: { major: number; minor: number } | null): string {
	if (!version || version.major > 2 || (version.major === 2 && version.minor >= 5)) {
		return SIZE_2_5_PLUS;
	}

	return SIZE_2_2_AND_EARLIER;
}

/**
 * Wan 2.6+ uses `/image-generation/generation`. Wan 2.5 and earlier use
 * `/text2image/image-synthesis` (t2i) or `/image2image/image-synthesis` (i2i).
 */
export function planWanImage(model: string): WanImagePlan {
	const id = normalizeModelId(model);
	if (!id.startsWith('wan') || isWanVideoModel(id)) {
		return SYNC_MULTIMODAL_PLAN;
	}

	const version = parseWanVersion(id);

	if (id.includes('-i2i')) {
		return {
			endpoint: IMAGE2IMAGE_ENDPOINT,
			async: true,
			input: 'prompt',
			attachImages: 'input',
			defaultSize: defaultSizeForVersion(version),
			n: 1,
			refs: { max: 3, required: true },
		};
	}

	if (!version) {
		return SYNC_MULTIMODAL_PLAN;
	}

	const isNewProtocol = version.major > 2 || (version.major === 2 && version.minor >= 6);
	if (!isNewProtocol) {
		return {
			endpoint: TEXT2IMAGE_ENDPOINT,
			async: true,
			input: 'prompt',
			attachImages: null,
			defaultSize: defaultSizeForVersion(version),
			n: 1,
			refs: null,
		};
	}

	const isImageEdit = id.includes('-image') && !id.includes('-t2i');
	return {
		endpoint: IMAGE_GENERATION_ENDPOINT,
		async: true,
		input: 'messages',
		attachImages: isImageEdit ? 'content' : null,
		defaultSize: defaultSizeForVersion(version),
		n: 1,
		refs: isImageEdit ? { max: 4, required: version.major === 2 && version.minor === 6 } : null,
	};
}
