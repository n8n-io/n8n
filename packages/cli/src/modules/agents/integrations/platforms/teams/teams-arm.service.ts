import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

// ARM reports failures in the same `{ error: { code, message } }` envelope as Graph.
import { graphErrorCode } from './teams-graph.service';

const ARM_BASE_URL = 'https://management.azure.com';
const ARM_TIMEOUT_MS = 60_000;

export interface ArmResponse {
	statusCode: number;
	body: unknown;
	ok: boolean;
}

/** Refuses a path that would move the request off the pinned host. */
function armUrl(path: string): string {
	let parsed: URL;
	try {
		parsed = new URL(`${ARM_BASE_URL}${path}`);
	} catch {
		throw new UnexpectedError('Refusing to send an Azure token to a path that is not a URL.');
	}
	if (parsed.origin !== ARM_BASE_URL) {
		throw new UnexpectedError('Refusing to send an Azure token off Azure Resource Manager.');
	}
	return parsed.href;
}

/**
 * ARM returns `nextLink` as an absolute URL, but this client pins the host and
 * takes a path. A link that points somewhere else is dropped rather than
 * followed.
 */
export function armNextLinkPath(nextLink: string): string | undefined {
	try {
		const url = new URL(nextLink);
		if (url.origin !== ARM_BASE_URL) return undefined;
		return `${url.pathname}${url.search}`;
	} catch {
		return undefined;
	}
}

/**
 * The smallest Azure Resource Manager client the bot step needs.
 *
 * Like the Graph client, this hands the status code back rather than throwing,
 * because the bot step falls to its next option on a refusal instead of
 * failing the setup.
 */
@Service()
export class TeamsArmService {
	constructor(
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {}

	async request(
		accessToken: string,
		method: 'GET' | 'PUT' | 'POST',
		path: string,
		body?: unknown,
	): Promise<ArmResponse> {
		// The bearer token is Azure's, so the request must not be able to leave
		// Azure. The base carries no path of its own, so a value beginning `@`
		// becomes userinfo and the rest becomes the host. The parsed URL is what
		// gets sent, so what was checked is what goes out.
		const url = armUrl(path);

		const response = await this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request({
				method,
				url,
				headers: {
					authorization: `Bearer ${accessToken}`,
					'content-type': 'application/json',
				},
				body: body === undefined ? undefined : JSON.stringify(body),
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: ARM_TIMEOUT_MS,
			});

		const ok = response.statusCode >= 200 && response.statusCode < 300;
		if (!ok) {
			this.logger.debug('[TeamsArm] Azure refused a call', {
				method,
				path,
				statusCode: response.statusCode,
				error: graphErrorCode(response.body),
			});
		}
		return { statusCode: response.statusCode, body: response.body, ok };
	}
}
