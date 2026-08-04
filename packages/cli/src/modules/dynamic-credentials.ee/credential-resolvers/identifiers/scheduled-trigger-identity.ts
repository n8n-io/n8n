import { Service } from '@n8n/di';
import { ExecutionContextService } from 'n8n-core';
import { z } from 'zod';

import { JwtService } from '@/services/jwt.service';

/** Discriminator placed on the credential context of an unattended, user-bound run. */
export const SCHEDULED_TRIGGER_SOURCE = 'scheduled-trigger';

/**
 * How long a minted runner token stays valid.
 *
 * It only has to outlive the handoff — mint, queue, dispatch, and any retry of
 * the scheduled task — not the execution it starts. Kept well above the
 * scheduler's lease and misfire grace so an ordinary redelivery still resolves.
 */
export const RUNNER_TOKEN_TTL_SECONDS = 15 * 60;

const RunnerTokenPayloadSchema = z.object({
	userId: z.string(),
	workflowId: z.string(),
});

export type RunnerTokenPayload = z.infer<typeof RunnerTokenPayloadSchema>;

/**
 * Mints and verifies the token that lets a scheduled run act for a user who is
 * not present.
 *
 * The other credential-context sources forward a token they were handed by a
 * live caller, so the token itself carries proof. Here there is no caller, so we
 * mint one: signing it keeps the claim tamper-evident, and the short expiry
 * bounds how long a leaked context stays usable. Whether the user may still be
 * acted for is a separate question, answered by the checks in `N8NIdentifier`.
 */
@Service()
export class ScheduledTriggerIdentityService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly executionContextService: ExecutionContextService,
	) {}

	/** Returns the encrypted credential context to put on `encryptedRunnerIdentity`. */
	async mintCredentialContext(userId: string, workflowId: string): Promise<string> {
		const token = this.jwtService.sign({ userId, workflowId } satisfies RunnerTokenPayload, {
			expiresIn: RUNNER_TOKEN_TTL_SECONDS,
		});

		return await this.executionContextService.buildScheduledTriggerCredentials(token);
	}

	/**
	 * Verifies signature and expiry, then the payload shape.
	 *
	 * @throws When the token is unsigned by this instance, expired, or malformed.
	 */
	verifyToken(token: string): RunnerTokenPayload {
		const decoded = this.jwtService.verify(token);
		return RunnerTokenPayloadSchema.parse(decoded);
	}
}
