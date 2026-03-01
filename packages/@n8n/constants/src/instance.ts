export const INSTANCE_ID_HEADER = 'n8n-instance-id';
export const INSTANCE_VERSION_HEADER = 'n8n-version';

export const INSTANCE_TYPES = ['main', 'webhook', 'worker'] as const;
export type InstanceType = (typeof INSTANCE_TYPES)[number];

export const INSTANCE_ROLES = ['unset', 'leader', 'follower'] as const;
export type InstanceRole = (typeof INSTANCE_ROLES)[number];
