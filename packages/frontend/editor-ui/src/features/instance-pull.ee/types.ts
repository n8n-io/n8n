import type { ReviewSummary } from '@n8n/api-types';

export type InstancePullRole = 'dev' | 'prd';

export type { ReviewSummary };

export type MissingCredential = NonNullable<ReviewSummary['missingCredentials']>[number];
