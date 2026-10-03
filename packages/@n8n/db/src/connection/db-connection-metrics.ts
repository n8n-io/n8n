import { Service } from '@n8n/di';

@Service()
export class DbConnectionMetrics {
	acquireDurationObserver?: (seconds: number) => void;
	disconnectionObserver?: () => void;
	recoveryAttemptObserver?: (result: 'success' | 'failure') => void;
}
