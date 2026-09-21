import { isObjectLiteral } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import {
	type IWebhookData,
	type IWorkflowExecutionTelemetryMetadata,
	type IWorkflowBase,
	type IDestinationNode,
	UserError,
} from 'n8n-workflow';

import {
	TEST_WEBHOOK_MAX_TIMEOUT,
	TEST_WEBHOOK_TIMEOUT,
	TEST_WEBHOOK_TIMEOUT_BUFFER,
} from '@/constants';
import { CacheService } from '@/services/cache/cache.service';

const TEST_WEBHOOK_REGISTRATION_VERSION = 1;

export type TestWebhookRegistration = {
	// A simple versioning to be safe. If you make a breaking change in the type, bump the version.
	// Any old records in the cache will just be ignored.
	version: typeof TEST_WEBHOOK_REGISTRATION_VERSION;
	pushRef?: string;
	telemetryMetadata?: IWorkflowExecutionTelemetryMetadata;
	workflowEntity: IWorkflowBase;
	destinationNode?: IDestinationNode;
	webhook: IWebhookData;
	/**
	 * Encrypted credential context carrying the identity of the builder who started
	 * this test run. A manual run normally picks this up from the auth cookie when its
	 * execution data is built, but a run that waits for a webhook returns before that,
	 * so the identity has to travel on the registration instead.
	 */
	encryptedRunnerIdentity?: string;
	/** Epoch ms at which the registration's own timeout fires. Set by `register()`. */
	expiresAt?: number;
};

// Type guard for TestWebhookRegistration.
// NOTE: we could have a more robust validation, but this is probably good enough for now.
function isTestWebhookRegistration(obj: unknown): obj is TestWebhookRegistration {
	if (!isObjectLiteral(obj)) {
		return false;
	}

	if (!('version' in obj)) return false;

	return obj.version === TEST_WEBHOOK_REGISTRATION_VERSION;
}

/** A registration past its own `expiresAt` is gone, whatever the hash TTL says. */
function isLiveRegistration(obj: unknown): obj is TestWebhookRegistration {
	return (
		isTestWebhookRegistration(obj) && (obj.expiresAt === undefined || obj.expiresAt > Date.now())
	);
}

@Service()
export class TestWebhookRegistrationsService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	private readonly cacheKey = 'test-webhooks';

	async register(
		registration: TestWebhookRegistration,
		ttl = TEST_WEBHOOK_TIMEOUT + TEST_WEBHOOK_TIMEOUT_BUFFER,
	) {
		const hashKey = this.toKey(registration.webhook);

		await this.cacheService.setHash(this.cacheKey, {
			[hashKey]: { ...registration, expiresAt: Date.now() + ttl },
		});

		const isCached = await this.cacheService.exists(this.cacheKey);

		if (!isCached) {
			throw new UserError(
				'Test webhook registration failed: workflow is too big. Remove pinned data',
			);
		}

		if (this.instanceSettings.isSingleMain) return;

		/**
		 * Multi-main setup: In a manual webhook execution, the main process that
		 * handles a webhook might not be the same as the main process that created
		 * the webhook. If so, after the test webhook has been successfully executed,
		 * the handler process commands the creator process to clear its test webhooks.
		 * We set a TTL on the key so that it is cleared even on creator process crash,
		 * with an additional buffer to ensure this safeguard expiration will not delete
		 * the key before the regular test webhook timeout fetches the key to delete it.
		 *
		 * The TTL covers the whole hash, so it is the longest window a registration can ask for
		 * (`TEST_WEBHOOK_MAX_TIMEOUT`) plus the buffer. A constant keeps concurrent registrations on
		 * different mains from shortening each other's TTL. Each new registration renews the TTL, so
		 * `expiresAt` bounds each entry and a read deletes an expired one (see `prune`).
		 */
		await this.cacheService.expire(
			this.cacheKey,
			TEST_WEBHOOK_MAX_TIMEOUT + TEST_WEBHOOK_TIMEOUT_BUFFER,
		);
	}

	async deregister(arg: IWebhookData | string) {
		if (typeof arg === 'string') {
			await this.cacheService.deleteFromHash(this.cacheKey, arg);
		} else {
			const hashKey = this.toKey(arg);
			await this.cacheService.deleteFromHash(this.cacheKey, hashKey);
		}
	}

	async get(key: string): Promise<TestWebhookRegistration | undefined> {
		const val = await this.cacheService.getHashValue(this.cacheKey, key);
		await this.prune({ [key]: val });
		return isLiveRegistration(val) ? val : undefined;
	}

	async getAllKeys() {
		const hash = await this.cacheService.getHash<TestWebhookRegistration>(this.cacheKey);

		if (!hash) return [];

		return Object.keys(hash);
	}

	async getAllRegistrations() {
		const hash = await this.cacheService.getHash<TestWebhookRegistration>(this.cacheKey);

		if (!hash) return [];

		await this.prune(hash);

		return Object.values(hash);
	}

	async getRegistrationsHash() {
		const val = await this.cacheService.getHash<TestWebhookRegistration>(this.cacheKey);
		if (val) await this.prune(val);
		return val;
	}

	/**
	 * Remove entries that are not live from `hash`. Also delete an expired entry from the store:
	 * each registration renews the TTL of the whole hash, so the TTL never removes an entry that a
	 * main left behind on exit. Keep entries of an unknown shape in the store; a main on another
	 * version may own them.
	 *
	 * A registration that replaces an expired entry between the read and this delete is lost. The
	 * window is one Redis round trip; a compare-and-delete script would close it.
	 */
	private async prune(hash: Record<string, unknown>) {
		for (const key of Object.keys(hash)) {
			const val = hash[key];
			if (isLiveRegistration(val)) continue;
			if (isTestWebhookRegistration(val)) await this.deregister(key);
			delete hash[key];
		}
	}

	toKey(webhook: Pick<IWebhookData, 'webhookId' | 'httpMethod' | 'path'>) {
		const { webhookId, httpMethod, path: webhookPath } = webhook;

		if (!webhookId) return [httpMethod, webhookPath].join('|');

		let path = webhookPath;

		if (path.startsWith(webhookId)) {
			const cutFromIndex = path.indexOf('/') + 1;

			path = path.slice(cutFromIndex);
		}

		return [httpMethod, webhookId, path.split('/').length].join('|');
	}
}
