import {
	EventService,
	RuntimeCredentialProxyService,
	type RuntimeCredentialValues,
} from '@n8n/backend-services';
import type { CredentialsEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecutionContext,
	INode,
} from 'n8n-workflow';
import { ExpressionError } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';

const RUNTIME_CREDENTIALS_KEY = '$runtimeCredentials';

/** Nodes that enforce the credential's domain allowlist on every request they send. */
const ALLOWED_CONSUMER_NODE_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.graphql',
]);

const OAUTH_BASE_TYPES = new Set(['oAuth1Api', 'oAuth2Api', 'googleOAuth2Api']);

const PROBED_KEYS = new Set(['then', 'toJSON']);

/** Reads the alias of each `$runtimeCredentials.alias` or `$runtimeCredentials['alias']`. */
const ALIAS_REFERENCE =
	/\$runtimeCredentials\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*['"]([^'"]+)['"]\s*\])/g;

/** Bounds the memory that the once-per-run audit check keeps. */
const MAX_AUDITED_KEYS = 10_000;

type PrimitiveValue = string | number | boolean;

export type RuntimeCredentialsRequest = {
	credential: Pick<CredentialsEntity, 'id' | 'name' | 'type' | 'isGlobal'>;
	data: ICredentialDataDecryptedObject;
	consumerNode: INode | undefined;
	executionContext: IExecutionContext | undefined;
	workflowId?: string;
	executionId?: string;
};

/**
 * Builds the `$runtimeCredentials` expression key for a credential.
 *
 * A trigger value reaches a credential only when an admin controls where it can go: the
 * credential must be global (members cannot edit it), restrict its domains, and be used by
 * a node that enforces that restriction.
 */
@Service()
export class RuntimeCredentialsResolver {
	/** A node can resolve its credential once per item, so the audit event is sent once per run. */
	private readonly auditedKeys = new Set<string>();

	constructor(
		private readonly runtimeCredentialProxy: RuntimeCredentialProxyService,
		private readonly credentialTypes: CredentialTypes,
		private readonly eventService: EventService,
	) {}

	/** Returns `undefined` when the credential does not refer to `$runtimeCredentials`. */
	async resolve(request: RuntimeCredentialsRequest): Promise<IDataObject | undefined> {
		if (!refersToRuntimeCredentials(request.data)) return undefined;

		this.assertAllowed(request);

		const values = await this.runtimeCredentialProxy.getRuntimeCredentials(
			request.executionContext,
		);
		this.audit(request);
		return buildRuntimeCredentialsProxy(values);
	}

	private audit({
		credential,
		data,
		consumerNode,
		workflowId,
		executionId,
	}: RuntimeCredentialsRequest) {
		const key = `${executionId ?? ''}:${credential.id}:${consumerNode?.name ?? ''}`;
		if (this.auditedKeys.has(key)) return;
		if (this.auditedKeys.size >= MAX_AUDITED_KEYS) this.auditedKeys.clear();
		this.auditedKeys.add(key);

		this.eventService.emit('runtime-credential-used', {
			credentialId: credential.id,
			credentialName: credential.name,
			credentialType: credential.type,
			aliases: referencedAliases(data),
			workflowId,
			executionId,
			nodeName: consumerNode?.name,
			nodeType: consumerNode?.type,
		});
	}

	private assertAllowed({ credential, data, consumerNode }: RuntimeCredentialsRequest) {
		const name = `"${credential.name}"`;

		if (!this.runtimeCredentialProxy.isEnabled()) {
			throw new UserError(
				`Credential ${name} uses $runtimeCredentials, but runtime credentials are not enabled on this instance`,
			);
		}

		if (!credential.isGlobal) {
			throw new UserError(
				`Credential ${name} cannot use $runtimeCredentials. Only credentials that an admin makes available to all users can use runtime values.`,
			);
		}

		if (!this.supportsRuntimeValues(credential.type)) {
			throw new UserError(
				`Credential ${name} cannot use $runtimeCredentials. Its type stores tokens between executions, so one request's value could reach the next.`,
			);
		}

		const allowedDomains =
			typeof data.allowedDomains === 'string' ? data.allowedDomains.trim() : '';
		if (data.allowedHttpRequestDomains !== 'domains' || allowedDomains === '') {
			throw new UserError(
				`Credential ${name} uses $runtimeCredentials, so it must restrict "Allowed HTTP Request Domains" to specific domains`,
			);
		}

		// An expression could take the allowlist from trigger data, so only a fixed list counts.
		if (isExpression(allowedDomains)) {
			throw new UserError(
				`Credential ${name} uses $runtimeCredentials, so "Allowed Domains" must be a fixed list, not an expression`,
			);
		}

		if (!consumerNode || !ALLOWED_CONSUMER_NODE_TYPES.has(consumerNode.type)) {
			throw new UserError(
				`Credential ${name} uses $runtimeCredentials and can only be used in the HTTP Request and GraphQL nodes`,
			);
		}
	}

	/** Excludes types that persist derived tokens back to the stored credential. */
	private supportsRuntimeValues(type: string): boolean {
		const typeNames = [type, ...this.credentialTypes.getParentTypes(type)];
		if (typeNames.some((typeName) => OAUTH_BASE_TYPES.has(typeName))) return false;

		return typeNames.every((typeName) => {
			const credentialType = this.credentialTypes.getByName(typeName);
			return (
				credentialType.preAuthentication === undefined &&
				!credentialType.properties.some((property) => property.typeOptions?.expirable === true)
			);
		});
	}
}

const isExpression = (value: string) => value.startsWith('=');

/** Only expression values can read runtime values. Literal text that names the key is data. */
function expressionsIn(data: ICredentialDataDecryptedObject): string[] {
	const expressions: string[] = [];
	const visit = (value: unknown) => {
		if (typeof value === 'string') {
			if (isExpression(value)) expressions.push(value);
		} else if (typeof value === 'object' && value !== null) {
			Object.values(value).forEach(visit);
		}
	};
	visit(data);
	return expressions;
}

function referencedAliases(data: ICredentialDataDecryptedObject): string[] {
	const aliases = new Set<string>();
	for (const expression of expressionsIn(data)) {
		for (const match of expression.matchAll(ALIAS_REFERENCE)) aliases.add(match[1] ?? match[2]);
	}
	return [...aliases];
}

function refersToRuntimeCredentials(data: ICredentialDataDecryptedObject): boolean {
	return expressionsIn(data).some((expression) => expression.includes(RUNTIME_CREDENTIALS_KEY));
}

/**
 * Throws `ExpressionError` on purpose: the expression engines swallow other errors and
 * return `undefined`, which would send an empty credential value without a warning.
 */
export function buildRuntimeCredentialsProxy(values: RuntimeCredentialValues): IDataObject {
	return new Proxy(
		{},
		{
			get(_target, alias) {
				if (typeof alias !== 'string') return undefined;

				if (!Object.prototype.hasOwnProperty.call(values, alias)) {
					// `await` and `JSON.stringify` probe these keys; a missing one must not throw.
					if (PROBED_KEYS.has(alias)) return undefined;
					throw new ExpressionError(`No runtime credential "${alias}" in this execution`, {
						description:
							'The value exists only when the trigger request carries it and an admin rule names it. Manual runs and credential tests have no runtime values.',
					});
				}

				return unwrap(alias, values[alias]);
			},
		},
	);
}

/** The trigger stores one value per item. A credential can use only one. */
function unwrap(alias: string, stored: unknown): PrimitiveValue {
	const candidates = Array.isArray(stored) ? stored : [stored];
	const distinct = [...new Map(candidates.map((value) => [JSON.stringify(value), value])).values()];

	if (distinct.length === 0) {
		throw new ExpressionError(`No runtime credential "${alias}" in this execution`);
	}

	if (distinct.length > 1) {
		throw new ExpressionError(
			`Runtime credential "${alias}" has different values in this execution`,
			{
				description:
					'The trigger received several items with different values. A credential can use only one.',
			},
		);
	}

	const [value] = distinct;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	throw new ExpressionError(`Runtime credential "${alias}" is not a text, number or boolean value`);
}
