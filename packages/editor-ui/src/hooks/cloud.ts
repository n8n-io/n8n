import { hooksAddFakeDoorFeatures } from '@/hooks/utils';
import type { PartialDeep } from 'type-fest';
import type { ExternalHooks } from '@/types';

export const n8nCloudHooks: PartialDeep<ExternalHooks> = {
	app: {
		mount: [
			() => {
				hooksAddFakeDoorFeatures();
			},
		],
	},
};
