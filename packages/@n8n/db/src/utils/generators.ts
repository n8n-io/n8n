import type { InstanceType } from '@n8n/constants';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

export function generateHostInstanceId(instanceType: InstanceType) {
	return `${instanceType}-${generateNanoId()}`;
}
