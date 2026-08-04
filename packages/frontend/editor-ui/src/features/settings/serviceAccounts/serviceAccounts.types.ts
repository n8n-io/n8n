import type { ServiceAccount } from '@n8n/api-types';

import type { SERVICE_ACCOUNT_ACTIONS } from './serviceAccounts.constants';

export type ServiceAccountAction =
	(typeof SERVICE_ACCOUNT_ACTIONS)[keyof typeof SERVICE_ACCOUNT_ACTIONS];

export type ServiceAccountRow = ServiceAccount;
