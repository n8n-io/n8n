import { User } from '@n8n/db';

import type { Telemetry } from '@/telemetry/index.js';

export const user = Object.assign(new User(), { id: 'user-1' });

export const createTelemetry = () => ({ track: vi.fn() }) as unknown as Telemetry;
