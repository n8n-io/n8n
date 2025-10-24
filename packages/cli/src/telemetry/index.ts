// Empty telemetry service - all telemetry has been removed
import { Service } from '@n8n/di';

@Service()
export class Telemetry {
	async init() {
		// No telemetry initialization
	}

	track() {
		// No telemetry tracking
	}

	identify() {
		// No telemetry identification
	}

	trackWorkflowExecution() {
		// No workflow execution tracking
	}

	async stopTracking() {
		// No telemetry cleanup
	}

	getCountsBuffer() {
		return {};
	}
}
