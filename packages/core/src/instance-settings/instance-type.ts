import type { InstanceType } from '@n8n/constants';

const COMMAND_INSTANCE_TYPES: InstanceType[] = ['webhook', 'worker', 'engine'];

export function instanceTypeFromArgv(argv: string[]): InstanceType {
	return COMMAND_INSTANCE_TYPES.find((type) => type === argv[2]) ?? 'main';
}
