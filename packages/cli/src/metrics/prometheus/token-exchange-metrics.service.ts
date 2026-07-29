import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';

import type { PrometheusMetricsCollector } from './base';

/**
 * Tracks token exchange (RFC 8693) and embed login flow metrics. Always enabled.
 *
 * Registers:
 * - `n8n_token_exchange_requests_total{result}` — success/failure rate
 * - `n8n_token_exchange_failures_total{reason}` — failure breakdown by reason
 * - `n8n_embed_login_requests_total{result}` — embed login success/failure rate
 * - `n8n_embed_login_failures_total{reason}` — embed login failure breakdown
 * - `n8n_token_exchange_jit_provisioning_total` — JIT-provisioned users
 * - `n8n_token_exchange_identity_linked_total` — identities linked to existing users
 */
@Service()
export class PrometheusTokenExchangeMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return true;
	}

	init() {
		const tokenExchangeRequestsTotal = new promClient.Counter({
			name: `${this.config.prefix}token_exchange_requests_total`,
			help: 'Total number of token exchange requests.',
			labelNames: ['result'],
		});
		tokenExchangeRequestsTotal.inc({ result: 'success' }, 0);
		tokenExchangeRequestsTotal.inc({ result: 'failure' }, 0);

		const tokenExchangeFailuresTotal = new promClient.Counter({
			name: `${this.config.prefix}token_exchange_failures_total`,
			help: 'Total number of token exchange failures broken down by reason.',
			labelNames: ['reason'],
		});

		const embedLoginRequestsTotal = new promClient.Counter({
			name: `${this.config.prefix}embed_login_requests_total`,
			help: 'Total number of embed login requests.',
			labelNames: ['result'],
		});
		embedLoginRequestsTotal.inc({ result: 'success' }, 0);
		embedLoginRequestsTotal.inc({ result: 'failure' }, 0);

		const embedLoginFailuresTotal = new promClient.Counter({
			name: `${this.config.prefix}embed_login_failures_total`,
			help: 'Total number of embed login failures broken down by reason.',
			labelNames: ['reason'],
		});

		const tokenExchangeJitProvisioningTotal = new promClient.Counter({
			name: `${this.config.prefix}token_exchange_jit_provisioning_total`,
			help: 'Total number of users JIT-provisioned via token exchange.',
		});
		tokenExchangeJitProvisioningTotal.inc(0);

		const tokenExchangeIdentityLinkedTotal = new promClient.Counter({
			name: `${this.config.prefix}token_exchange_identity_linked_total`,
			help: 'Total number of external identities linked to existing users via token exchange.',
		});
		tokenExchangeIdentityLinkedTotal.inc(0);

		this.eventService.on('token-exchange-succeeded', () => {
			tokenExchangeRequestsTotal.inc({ result: 'success' }, 1);
		});

		this.eventService.on('token-exchange-failed', ({ failureReason }) => {
			tokenExchangeRequestsTotal.inc({ result: 'failure' }, 1);
			tokenExchangeFailuresTotal.inc({ reason: failureReason }, 1);
		});

		this.eventService.on('embed-login', () => {
			embedLoginRequestsTotal.inc({ result: 'success' }, 1);
		});

		this.eventService.on('embed-login-failed', ({ failureReason }) => {
			embedLoginRequestsTotal.inc({ result: 'failure' }, 1);
			embedLoginFailuresTotal.inc({ reason: failureReason }, 1);
		});

		this.eventService.on('token-exchange-user-provisioned', () => {
			tokenExchangeJitProvisioningTotal.inc(1);
		});

		this.eventService.on('token-exchange-identity-linked', () => {
			tokenExchangeIdentityLinkedTotal.inc(1);
		});
	}
}
