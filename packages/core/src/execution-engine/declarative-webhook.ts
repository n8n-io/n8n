import get from 'lodash/get';
import type {
	DeclarativeSecretGenerator,
	DeclarativeWebhookCheckExists,
	DeclarativeWebhookCreate,
	DeclarativeWebhookDelete,
	DeclarativeWebhookHandshake,
	DeclarativeWebhookVerification,
	IDataObject,
	IDeclarativeWebhookTrigger,
	IHookFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodePropertyRouting,
	INodeType,
	IWebhookFunctions,
	IWebhookResponseData,
	IWorkflowDataProxyAdditionalKeys,
	JsonObject,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	NodeApiError,
	NodeOperationError,
	UnexpectedError,
} from 'n8n-workflow';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import {
	ExecuteContext,
	ExecuteSingleContext,
	HookContext,
	WebhookContext,
} from './node-execution-context';
import { runPostReceiveAction } from './post-receive';
import { RoutingNode } from './routing-node';

type LifecycleSlots = NonNullable<NonNullable<INodeType['webhookMethods']>['default']>;

/**
 * Runs one lifecycle `routing` block through `RoutingNode`, the same way
 * `createDeclarativePoll` runs its poll request: a fabricated `ExecuteContext`
 * with one synthetic input item, and the routing carried by a nameless hidden
 * property (`RoutingNode` reads routing off properties and skips the parameter
 * lookup when the name is empty).
 */
async function runLifecycleRouting(
	context: HookContext,
	nodeType: INodeType,
	routing: INodePropertyRouting,
	extraKeys: IWorkflowDataProxyAdditionalKeys,
): Promise<INodeExecutionData[]> {
	const { workflow, node, additionalData, mode } = context;
	const executeData = { node, data: {}, source: null };
	const executeContext = new ExecuteContext(
		workflow,
		node,
		additionalData,
		mode,
		createRunExecutionData(),
		0,
		[],
		{ main: [[{ json: {} }]] },
		executeData,
		[],
	);
	const hookNodeType: INodeType = {
		...nodeType,
		description: {
			...nodeType.description,
			properties: [
				...nodeType.description.properties,
				{ displayName: '', name: '', type: 'hidden', default: '', routing },
			],
		},
	};
	const routingNode = new RoutingNode(executeContext, hookNodeType, undefined, extraKeys);
	return (await routingNode.runNode())?.[0] ?? [];
}

/**
 * The static-data keys a trigger manages: whatever its create step stores, or
 * the explicit list a node declares when create is a function and so has no
 * `store` to read them from.
 */
function managedKeys(trigger: IDeclarativeWebhookTrigger): string[] {
	if (trigger.managedKeys) return trigger.managedKeys;
	const create = trigger.lifecycle.create;
	if (typeof create === 'function' || !create.store) return [];
	return Object.keys(create.store);
}

function clearManagedKeys(trigger: IDeclarativeWebhookTrigger, staticData: IDataObject): void {
	for (const key of managedKeys(trigger)) delete staticData[key];
}

function resolveValue(
	context: HookContext | WebhookContext,
	value: string,
	extraKeys: IWorkflowDataProxyAdditionalKeys,
): unknown {
	return context.workflow.expression.getSimpleParameterValue(
		context.node,
		value,
		context.mode,
		extraKeys,
	);
}

function applyStore(
	context: HookContext | WebhookContext,
	store: Record<string, string> | undefined,
	extraKeys: IWorkflowDataProxyAdditionalKeys,
	staticData: IDataObject,
): void {
	if (!store) return;
	for (const [key, value] of Object.entries(store)) {
		staticData[key] = resolveValue(context, value, extraKeys) as IDataObject[string];
	}
}

function assertHookContext(context: IHookFunctions): asserts context is HookContext {
	if (!(context instanceof HookContext)) {
		throw new UnexpectedError('Declarative webhook lifecycle needs a HookContext');
	}
}

/** `$webhookUrl` + `$staticData`, shared by every lifecycle request. */
function hookKeys(context: HookContext, staticData: IDataObject): IWorkflowDataProxyAdditionalKeys {
	return {
		$webhookUrl: context.getNodeWebhookUrl('default'),
		$staticData: staticData,
	} as IWorkflowDataProxyAdditionalKeys;
}

function createCheckExists(
	nodeType: INodeType,
	trigger: IDeclarativeWebhookTrigger,
	config: DeclarativeWebhookCheckExists,
): LifecycleSlots['checkExists'] {
	return async function (this: IHookFunctions) {
		assertHookContext(this);
		const staticData = this.getWorkflowStaticData('node');
		const extraKeys = hookKeys(this, staticData);

		if (!config.matchOn) {
			const idKey = config.idKey ?? 'webhookId';
			if (staticData[idKey] === undefined) return false;
			// An empty required key (typically the signing secret) leaves the stored hook
			// unable to serve deliveries, so report it absent and let create replace it.
			if (config.requireKeys?.some((key) => !staticData[key])) return false;
			try {
				await runLifecycleRouting(this, nodeType, config.routing, extraKeys);
				return true;
			} catch (error) {
				const notFound = config.notFoundHttpCodes ?? [404];
				if (
					error instanceof NodeApiError &&
					error.httpCode !== null &&
					notFound.includes(Number(error.httpCode))
				) {
					clearManagedKeys(trigger, staticData);
					return false;
				}
				throw error;
			}
		}

		const items = await runLifecycleRouting(this, nodeType, config.routing, extraKeys);
		for (const item of items) {
			const itemKeys = { ...extraKeys, $item: item.json };
			const matches = config.matchOn.every(
				({ itemProperty, value }) =>
					get(item.json, itemProperty) === resolveValue(this, value, itemKeys),
			);
			if (matches) {
				applyStore(this, config.store, itemKeys, staticData);
				return true;
			}
		}
		return false;
	};
}

function generateSecret({ type, length, prefix = '' }: DeclarativeSecretGenerator): string {
	switch (type) {
		case 'hex':
			return prefix + randomBytes(length ?? 32).toString('hex');
		case 'base64':
			return prefix + randomBytes(length ?? 32).toString('base64');
		case 'uuid':
			return prefix + randomUUID();
		case 'alphanumericLower': {
			const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
			const chars = randomBytes(length ?? 10);
			return prefix + [...chars].map((byte) => alphabet[byte % alphabet.length]).join('');
		}
	}
}

function createCreate(
	nodeType: INodeType,
	config: DeclarativeWebhookCreate,
): LifecycleSlots['create'] {
	return async function (this: IHookFunctions) {
		assertHookContext(this);
		const staticData = this.getWorkflowStaticData('node');
		const $generated = Object.fromEntries(
			Object.entries(config.generate ?? {}).map(([name, generator]) => [
				name,
				generateSecret(generator),
			]),
		);
		const extraKeys = { ...hookKeys(this, staticData), $generated };

		if (config.rejectLocalhostUrl && this.getNodeWebhookUrl('default')?.includes('//localhost')) {
			throw new NodeOperationError(
				this.getNode(),
				'The Webhook can not work on "localhost". Please setup n8n on a custom domain.',
			);
		}

		const items = await runLifecycleRouting(this, nodeType, config.routing, extraKeys);
		const response = items[0]?.json ?? {};

		if (config.validateResponse) {
			const valid = resolveValue(this, config.validateResponse, {
				...extraKeys,
				$response: response,
			});
			if (!valid) {
				throw new NodeApiError(this.getNode(), response as JsonObject, {
					message: 'Webhook creation response did not contain the expected data.',
				});
			}
		}

		applyStore(this, config.store, { ...extraKeys, $response: response }, staticData);
		return true;
	};
}

function createDelete(
	nodeType: INodeType,
	trigger: IDeclarativeWebhookTrigger,
	config: DeclarativeWebhookDelete,
): LifecycleSlots['delete'] {
	return async function (this: IHookFunctions) {
		assertHookContext(this);
		const staticData = this.getWorkflowStaticData('node');
		const idKey = config.idKey ?? 'webhookId';
		if (staticData[idKey] === undefined) return true;
		try {
			await runLifecycleRouting(this, nodeType, config.routing, hookKeys(this, staticData));
		} catch {
			// Deregistration failures must not block deactivation; static data is
			// kept so a later delete can retry (matches the shipped trigger nodes).
			return false;
		}
		clearManagedKeys(trigger, staticData);
		return true;
	};
}

/**
 * Builds the `webhookMethods.default` slots for a node whose description
 * carries `trigger: { type: 'webhook' }`. A function-valued slot is used
 * as-is; an omitted checkExists always re-registers (⇒ false) and an omitted
 * delete has nothing to deregister (⇒ true).
 */
export function createDeclarativeWebhookMethods(
	nodeType: INodeType,
	trigger: IDeclarativeWebhookTrigger,
): LifecycleSlots {
	const { checkExists, create, delete: del } = trigger.lifecycle;
	return {
		checkExists:
			checkExists === undefined
				? async () => false
				: typeof checkExists === 'function'
					? checkExists
					: createCheckExists(nodeType, trigger, checkExists),
		create: typeof create === 'function' ? create : createCreate(nodeType, create),
		delete:
			del === undefined
				? async () => true
				: typeof del === 'function'
					? del
					: createDelete(nodeType, trigger, del),
	};
}

/** Ported from `packages/nodes-base/utils/webhook-signature-verification.ts` (core cannot import nodes-base). */
function isTimestampValid(timestamp: string | undefined, maxAgeSeconds: number): boolean {
	if (timestamp === undefined) return false;
	const parsed = parseInt(timestamp, 10);
	if (isNaN(parsed)) return false;
	// Convert to seconds if the timestamp is in milliseconds
	const timestampSec = parsed > 1e10 ? Math.floor(parsed / 1000) : parsed;
	const currentTimeSec = Math.floor(Date.now() / 1000);
	return Math.abs(currentTimeSec - timestampSec) <= maxAgeSeconds;
}

function constantTimeEquals(expected: string, actual: string): boolean {
	const expectedBuffer = Buffer.from(expected);
	const actualBuffer = Buffer.from(actual);
	return (
		expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
	);
}

/**
 * Applies a `handler.verification` descriptor to the incoming delivery.
 * Same semantics as the shared programmatic util: constant-time comparison,
 * optional replay window, `skipIfNoSecret` for unsigned legacy hooks. Returns
 * true when the delivery may proceed; never throws.
 */
async function verifyDeliverySignature(
	context: WebhookContext,
	config: DeclarativeWebhookVerification,
): Promise<boolean> {
	try {
		const headers = context.getHeaderData();

		if (config.timestampHeader) {
			const timestamp = headers[config.timestampHeader.toLowerCase()] as string | undefined;
			if (!isTimestampValid(timestamp, config.maxTimestampAgeSeconds ?? 300)) return false;
		}

		const secret = resolveValue(context, config.secret, {
			$staticData: context.getWorkflowStaticData('node'),
			...(config.credentialType && {
				$credentials: await context.getCredentials(config.credentialType),
			}),
		} as IWorkflowDataProxyAdditionalKeys);
		if (typeof secret !== 'string' || secret === '') {
			if (config.skipIfNoSecret) return true;
			// A hook can sit without a stored secret until it is re-registered, and
			// rejecting is the safe answer for that window. Say so, or a stopped
			// trigger looks identical to a bad signature.
			context.logger.warn(
				`Webhook trigger "${context.getNode().name}" rejected a delivery because no signature secret is available. Activate the workflow again to re-register the webhook.`,
				{ workflowId: context.getWorkflow().id },
			);
			return false;
		}

		const actual = headers[config.signatureHeader.toLowerCase()];
		if (typeof actual !== 'string' || actual === '') return false;

		if (config.algorithm === 'token') {
			return constantTimeEquals(secret, actual);
		}

		const req: { rawBody?: Buffer | string } = context.getRequestObject();
		const payload =
			(config.signedPayload ?? 'rawBody') === 'rawBody'
				? (req.rawBody ?? JSON.stringify(context.getBodyData()))
				: JSON.stringify(context.getBodyData());
		const hmac = createHmac(config.algorithm === 'hmac-sha1' ? 'sha1' : 'sha256', secret);
		hmac.update(payload);
		const expected = (config.prefix ?? '') + hmac.digest(config.encoding ?? 'hex');
		return constantTimeEquals(expected, actual);
	} catch {
		return false;
	}
}

/** Answers a handshake: static-data writes, then the configured response. */
function respondToHandshake(
	context: WebhookContext,
	handshake: DeclarativeWebhookHandshake,
	requestKeys: IWorkflowDataProxyAdditionalKeys,
): IWebhookResponseData {
	applyStore(context, handshake.store, requestKeys, context.getWorkflowStaticData('node'));

	const respond = handshake.respond ?? {};
	const body = respond.body ? resolveValue(context, respond.body, requestKeys) : 'OK';
	if (!respond.statusCode && !respond.contentType && !respond.headers) {
		return { webhookResponse: body };
	}

	const res = context.getResponseObject();
	for (const [name, value] of Object.entries(respond.headers ?? {})) {
		res.setHeader(name, String(resolveValue(context, value, requestKeys)));
	}
	if (respond.contentType) res.setHeader('content-type', respond.contentType);
	res
		.status(respond.statusCode ?? 200)
		.send(body)
		.end();
	return { noWebhookResponse: true };
}

/**
 * Default `webhook()` for a declarative webhook trigger. On a `setup` endpoint
 * every request is a handshake. On the `default` endpoint the pipeline is:
 * handshake (`when` matches ⇒ respond, no run) → verification (failure ⇒ 401,
 * no run) → ping (⇒ custom response, no run) → filter (miss ⇒ 200, no run) →
 * output shaping → emit.
 */
export function createDeclarativeWebhook(
	trigger: IDeclarativeWebhookTrigger,
): NonNullable<INodeType['webhook']> {
	const { handshake, verification, ping, filter, output } = trigger.handler ?? {};
	return async function (this: IWebhookFunctions): Promise<IWebhookResponseData> {
		if (!(this instanceof WebhookContext)) {
			throw new UnexpectedError('Declarative webhook handler needs a WebhookContext');
		}

		const requestKeys = {
			$request: {
				body: this.getBodyData(),
				headers: this.getHeaderData(),
				query: this.getQueryData(),
			},
		} as IWorkflowDataProxyAdditionalKeys;

		if (this.getWebhookName() === 'setup') {
			if (handshake?.when && !resolveValue(this, handshake.when, requestKeys)) {
				this.getResponseObject().status(401).send('Unauthorized').end();
				return { noWebhookResponse: true };
			}
			return respondToHandshake(this, handshake ?? {}, requestKeys);
		}

		if (handshake?.when && resolveValue(this, handshake.when, requestKeys)) {
			return respondToHandshake(this, handshake, requestKeys);
		}

		if (verification && !(await verifyDeliverySignature(this, verification))) {
			this.getResponseObject().status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}

		if (ping && resolveValue(this, ping.when, requestKeys)) {
			return { webhookResponse: ping.response ?? 'OK' };
		}

		if (filter) {
			const allowedValue = resolveValue(this, filter.allowed, requestKeys);
			const allowed = Array.isArray(allowedValue) ? allowedValue : [allowedValue];
			const actual = resolveValue(this, filter.actual, requestKeys);
			const wildcardHit = filter.wildcard !== undefined && allowed.includes(filter.wildcard);
			if (!wildcardHit && !allowed.includes(actual)) return {};
		}

		const body = this.getBodyData();
		let items = this.helpers.returnJsonArray(body);

		if (output?.postReceive?.length) {
			// The delivery stands in for the response the actions expect.
			const response: IN8nHttpFullResponse = {
				body,
				headers: this.getHeaderData(),
				statusCode: 200,
			};
			const { workflow, node, additionalData, mode } = this;
			const executeData = { node, data: {}, source: null };
			const executeSingleFunctions = new ExecuteSingleContext(
				workflow,
				node,
				additionalData,
				mode,
				createRunExecutionData(),
				0,
				[],
				{ main: [[{ json: {} }]] },
				0,
				executeData,
			);
			for (const action of output.postReceive) {
				items = await runPostReceiveAction(
					executeSingleFunctions,
					action,
					items,
					response,
					undefined,
					0,
					0,
					{
						node,
						resolveValue: (value, itemIndex, runIndex, actionExecuteData, additionalKeys) =>
							workflow.expression.getParameterValue(
								value,
								null,
								runIndex,
								itemIndex,
								node.name,
								[],
								mode,
								additionalKeys,
								actionExecuteData,
							),
						extraKeys: requestKeys,
					},
				);
			}
		}

		if (output?.includeMeta) {
			const headers = this.getHeaderData();
			const query = this.getQueryData();
			// Spread keeps binary attached by a postReceive action.
			items = items.map((item) => ({ ...item, json: { body: item.json, headers, query } }));
		}

		return { workflowData: [items] };
	};
}
