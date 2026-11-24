import type { TelemetryProxy } from '@n8n/backend-services';
import { User } from '@n8n/db';

export const user = Object.assign(new User(), { id: 'user-1' });

export const createTelemetry = () => ({ track: vi.fn() }) as unknown as TelemetryProxy;
