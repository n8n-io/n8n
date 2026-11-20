export { isRecord } from '@n8n/utils/is-record';

export interface GymAdmin {
	seed(tenant: string, overlay: unknown): Promise<unknown>;
	event(tenant: string, event: unknown): Promise<void>;
}
