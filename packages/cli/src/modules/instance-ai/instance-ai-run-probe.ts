import { Service } from '@n8n/di';

/**
 * Lightweight bridge so the Prometheus collector can read the live active-run
 * count without depending on the heavy (lazily-registered) InstanceAiService.
 *
 * InstanceAiService registers a pull provider; the gauge reads it at scrape
 * time. Pull (not push) keeps the count drift-free across suspend/resume.
 * Defaults to 0 when Instance AI is disabled and no provider is registered.
 */
@Service()
export class InstanceAiRunProbe {
	private activeRunCountProvider: () => number = () => 0;

	registerActiveRunCountProvider(provider: () => number): void {
		this.activeRunCountProvider = provider;
	}

	activeRunCount(): number {
		return this.activeRunCountProvider();
	}
}
