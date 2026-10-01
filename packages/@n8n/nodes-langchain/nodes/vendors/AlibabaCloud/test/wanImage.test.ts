import { planWanImage } from '../helpers/wanImage';

const IMAGE_GENERATION = '/api/v1/services/aigc/image-generation/generation';
const TEXT2IMAGE = '/api/v1/services/aigc/text2image/image-synthesis';
const IMAGE2IMAGE = '/api/v1/services/aigc/image2image/image-synthesis';
const MULTIMODAL = '/api/v1/services/aigc/multimodal-generation/generation';

describe('planWanImage', () => {
	it.each([
		[
			'wan2.6-t2i',
			{
				endpoint: IMAGE_GENERATION,
				async: true,
				input: 'messages',
				attachImages: null,
				defaultSize: '1280*1280',
				n: 1,
				refs: null,
			},
		],
		[
			'wan2.6-image',
			{
				endpoint: IMAGE_GENERATION,
				async: true,
				input: 'messages',
				attachImages: 'content',
				defaultSize: '1280*1280',
				n: 1,
				refs: { max: 4, required: true },
			},
		],
		[
			'wan2.7-image',
			{
				endpoint: IMAGE_GENERATION,
				async: true,
				input: 'messages',
				attachImages: 'content',
				defaultSize: '1280*1280',
				n: 1,
				refs: { max: 4, required: false },
			},
		],
		[
			'wan2.7-image-pro',
			{
				endpoint: IMAGE_GENERATION,
				async: true,
				input: 'messages',
				attachImages: 'content',
				defaultSize: '1280*1280',
				n: 1,
				refs: { max: 4, required: false },
			},
		],
		[
			'WAN2.6-T2I',
			{
				endpoint: IMAGE_GENERATION,
				async: true,
				input: 'messages',
				attachImages: null,
				defaultSize: '1280*1280',
				n: 1,
				refs: null,
			},
		],
		[
			'wan3.0-t2i',
			{
				endpoint: IMAGE_GENERATION,
				async: true,
				input: 'messages',
				attachImages: null,
				defaultSize: '1280*1280',
				n: 1,
				refs: null,
			},
		],
		[
			'wan2.5-t2i-preview',
			{
				endpoint: TEXT2IMAGE,
				async: true,
				input: 'prompt',
				attachImages: null,
				defaultSize: '1280*1280',
				n: 1,
				refs: null,
			},
		],
		[
			'wan2.2-t2i-flash',
			{
				endpoint: TEXT2IMAGE,
				async: true,
				input: 'prompt',
				attachImages: null,
				defaultSize: '1024*1024',
				n: 1,
				refs: null,
			},
		],
		[
			'wanx2.1-t2i-plus',
			{
				endpoint: TEXT2IMAGE,
				async: true,
				input: 'prompt',
				attachImages: null,
				defaultSize: '1024*1024',
				n: 1,
				refs: null,
			},
		],
		[
			'wanx2.0-t2i-turbo',
			{
				endpoint: TEXT2IMAGE,
				async: true,
				input: 'prompt',
				attachImages: null,
				defaultSize: '1024*1024',
				n: 1,
				refs: null,
			},
		],
		[
			'wanx-v1',
			{
				endpoint: TEXT2IMAGE,
				async: true,
				input: 'prompt',
				attachImages: null,
				defaultSize: '1024*1024',
				n: 1,
				refs: null,
			},
		],
		[
			'wan2.5-i2i-preview',
			{
				endpoint: IMAGE2IMAGE,
				async: true,
				input: 'prompt',
				attachImages: 'input',
				defaultSize: '1280*1280',
				n: 1,
				refs: { max: 3, required: true },
			},
		],
		[
			'qwen-image',
			{
				endpoint: MULTIMODAL,
				async: false,
				input: 'messages',
				attachImages: null,
				defaultSize: null,
				n: null,
				refs: null,
			},
		],
		[
			'z-image-turbo',
			{
				endpoint: MULTIMODAL,
				async: false,
				input: 'messages',
				attachImages: null,
				defaultSize: null,
				n: null,
				refs: null,
			},
		],
		[
			'wan2.6-t2v',
			{
				endpoint: MULTIMODAL,
				async: false,
				input: 'messages',
				attachImages: null,
				defaultSize: null,
				n: null,
				refs: null,
			},
		],
		[
			'wan2.6-i2v-flash',
			{
				endpoint: MULTIMODAL,
				async: false,
				input: 'messages',
				attachImages: null,
				defaultSize: null,
				n: null,
				refs: null,
			},
		],
	] as const)('%s', (model, expected) => {
		expect(planWanImage(model)).toEqual(expected);
	});
});
