import type { InstanceType } from '@n8n/constants';
import { generateNanoId } from '@n8n/utils';

export function generateHostInstanceId(instanceType: InstanceType) {
	return `${instanceType}-${generateNanoId()}`;
}
