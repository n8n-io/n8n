process.env.N8N_EXECUTION_QUOTA_MODE = 'counter';
process.env.N8N_EXECUTION_QUOTA_COUNTER_STORE = 'memory';

import { counterQuotaCases } from './counter-quota.cases';

describe('ExecutionQuotaService with the memory counter', () => {
	counterQuotaCases('memory');
});
