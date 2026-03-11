import { registerAs } from '@nestjs/config';

export interface SandboxConfigType {
	/** Default command timeout in milliseconds */
	timeoutMs: number;
}

export default registerAs(
	'sandbox',
	(): SandboxConfigType => ({
		timeoutMs: parseInt(process.env.COMMAND_SERVICE_TIMEOUT_MS ?? '30000', 10),
	}),
);
