process.env.N8N_EXECUTION_QUOTA_MODE = 'counter';
process.env.N8N_EXECUTION_QUOTA_COUNTER_STORE = 'redis';

import { counterQuotaCases } from './counter-quota.cases';

describe('ExecutionQuotaService with the Redis counter', () => {
	counterQuotaCases('redis');
});
