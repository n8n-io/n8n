import { isRecord } from '@n8n/utils/is-record';
import {
	assertUrlAllowed,
	NodeOperationError,
	toHostname,
	UserError,
	type INode,
} from 'n8n-workflow';

import type { AnyCredentialType } from './credentials';
import {
	DEFAULT_RUN_LIMITS,
	usesBinary,
	type ContractDocument,
	type ContractEgress,
	type HostImport,
	type RunLimits,
} from './define';
import { providerInputOf, type ProviderKind } from './providers';

/**
 * Host lists use the `isDomainAllowed` syntax: `api.example.com`, or `*.example.com` for its
 * subdomains only. `undefined` is no limit.
 */
type Hosts = readonly string[] | undefined;

const unique = (hosts: ReadonlyArray<string | undefined>) => [
	...new Set(hosts.flatMap((host) => (host ? [host] : []))),
];

/** A host with a comma would split into two entries of the `allowedDomains` text. */
const urlHostOf = (url: unknown) => {
	const host = typeof url === 'string' ? toHostname(url) : undefined;
	return host?.includes(',') ? undefined : host;
};

const matches = (host: string, pattern: string) =>
	pattern.startsWith('*.') ? host.endsWith(pattern.slice(1)) : host === pattern;

export const allowsHost = (hosts: readonly string[], host: string) =>
	hosts.some((pattern) => matches(host, pattern));

/** Each host that `hosts` allows in full: a wildcard only when a wildcard of `hosts` holds it. */
const covered = (entry: string, hosts: readonly string[]) =>
	entry.startsWith('*.')
		? hosts.some((pattern) => pattern.startsWith('*.') && matches(`x${entry.slice(1)}`, pattern))
		: allowsHost(hosts, entry);

/** The hosts both lists allow, as one list. */
export const narrowHosts = (a: readonly string[], b: readonly string[]) =>
	unique([...a.filter((entry) => covered(entry, b)), ...b.filter((entry) => covered(entry, a))]);

/** The user setting "Allowed HTTP Request Domains" and its list, as the credential stores them. */
function restrictionOf(data: unknown) {
	const { allowedHttpRequestDomains: mode, allowedDomains } = isRecord(data) ? data : {};
	const list = typeof allowedDomains === 'string' ? allowedDomains : '';
	return {
		mode,
		hosts: unique(list.split(',').map((entry) => entry.trim().toLowerCase().replace(/\.$/, ''))),
	};
}

/**
 * The hosts a credential may go to. A type with `hosts` or `baseUrl` goes to its own hosts, and
 * the user list (mode `domains`) adds hosts. A type with neither keeps the legacy meaning:
 * `all` is no limit, `domains` is the list, `none` refuses. `baseUrl` is the resolved base URL of
 * the credential. Throws a `UserError` when the credential refuses every host.
 */
export function credentialHostsOf(
	type: AnyCredentialType | undefined,
	data: unknown,
	{
		surface,
		baseUrl,
	}: {
		/** What sends the request, for the error message, e.g. the node name. */
		readonly surface: string;
		/** The resolved base URL of the credential. */
		readonly baseUrl?: string;
	},
): Hosts {
	const { mode, hosts: listed } = restrictionOf(data);
	if (type?.hosts !== undefined || type?.baseUrl !== undefined) {
		const derived = type.baseUrl ? urlHostOf(baseUrl) : undefined;
		return unique([...(type.hosts ?? []), derived, ...(mode === 'domains' ? listed : [])]);
	}
	// The texts of `getCredentialAllowedDomains`, so a user sees the legacy message.
	if (mode === 'none') {
		throw new UserError(`This credential is configured to prevent use within an ${surface} node`);
	}
	if (mode !== 'domains') return undefined;
	if (listed.length === 0) {
		throw new UserError(
			'No allowed domains specified. Configure allowed domains or change restriction setting.',
		);
	}
	return listed;
}

/** `{region}.api.example.com` with the input value of `region`, which must be one host label. */
function filledHost(template: string, input: Readonly<Record<string, unknown>>) {
	return template
		.replace(/\{([^}]+)\}/g, (_, field: string) => {
			const value = input[field];
			if (typeof value !== 'string' || !/^[a-z0-9-]+$/i.test(value)) {
				throw new UserError(`The host field "${field}" is not one host label`);
			}
			return value;
		})
		.toLowerCase();
}

/** What the host allows for the requests of one item. */
export interface EgressPolicy {
	/** The hosts the action may reach. `undefined` is no limit: a trigger without base URL hosts. */
	readonly action: Hosts;
	/**
	 * The action hosts that also bind each redirect hop. A host from input does not: the user
	 * picked the server, and the server picks where it redirects.
	 */
	readonly redirect: Hosts;
	/** The hosts of the applied credential. */
	readonly credential: Hosts;
}

/**
 * The action hosts for one item: the base URL hosts, the declared hosts with their input fields
 * filled, and the host of the `fromInput` field. No `egress` and no base URL is no action limit,
 * which only a trigger uses: an action without `egress` gives `{ hosts: [] }` and reaches only
 * its base URL hosts. The credential hosts still apply.
 */
export function actionHostsOf(
	egress: ContractEgress | undefined,
	input: Readonly<Record<string, unknown>>,
	baseUrls: ReadonlyArray<string | undefined>,
): Pick<EgressPolicy, 'action' | 'redirect'> {
	const base = unique(baseUrls.map(urlHostOf));
	if (!egress && base.length === 0) return { action: undefined, redirect: undefined };
	const declared = (egress?.hosts ?? []).map((host) => filledHost(host, input));
	const fromInput =
		egress?.fromInput === undefined ? undefined : urlHostOf(input[egress.fromInput]);
	const action = unique([...base, ...declared, fromInput]);
	return { action, redirect: egress?.fromInput === undefined ? action : undefined };
}

/**
 * Refuses a URL outside the policy. Returns the `allowedDomains` for the request layer, which
 * checks each redirect hop against it, or `undefined` when no list limits the hops.
 */
export function egressOf(
	policy: EgressPolicy,
	url: string,
	{
		node,
		actionId,
		itemIndex,
	}: { readonly node: INode; readonly actionId: string; readonly itemIndex?: number },
): string | undefined {
	const refuse = (message: string) => new NodeOperationError(node, message, { itemIndex });
	const host = urlHostOf(url);
	if (!host) throw refuse(`${actionId} cannot send a request to a URL without a host`);
	if (policy.action && !allowsHost(policy.action, host)) {
		throw refuse(
			`Host not allowed: ${actionId} may send requests to ${policy.action.join(', ') || 'no host'}, not to ${host}`,
		);
	}
	// An empty `allowedDomains` allows every host, so an empty list never reaches the request layer.
	if (policy.credential?.length === 0) {
		throw refuse(`Host not allowed: the credential of ${actionId} may not go to ${host}`);
	}
	if (policy.credential) {
		assertUrlAllowed({ url, allowedDomains: policy.credential.join(', '), node });
	}
	const hops =
		policy.redirect && policy.credential
			? narrowHosts(policy.redirect, policy.credential)
			: (policy.redirect ?? policy.credential);
	if (hops?.length === 0) {
		throw refuse(`Host not allowed: ${actionId} may not send a request to ${host}`);
	}
	return hops?.join(', ');
}

/** Problems of one workflow node that the builder finds before a run. */
export interface EgressIssues {
	/** Hosts that the credential may not go to. The build fails. */
	readonly errors: readonly string[];
	/** Hosts that only the run can check, e.g. from an expression. */
	readonly warnings: readonly string[];
}

/** An n8n expression, e.g. `={{ $json.url }}`: its value is known at run time only. */
const isExpression = (value: unknown) => typeof value === 'string' && value.startsWith('=');

/**
 * The build check of one node: each host its parameters name must be a host of the credential.
 * `credential.hosts` comes from `credentialHostsOf`. An expression gives a warning, because the
 * host checks it at run time.
 */
export function egressIssuesOf(
	egress: ContractEgress | undefined,
	parameters: Readonly<Record<string, unknown>>,
	credential: {
		/** The credential name, for the messages. */
		readonly name: string;
		/** The hosts of the credential, from `credentialHostsOf`. */
		readonly hosts: readonly string[];
	},
): EgressIssues {
	const outside = (host: string) =>
		`${host} is not an allowed host of the credential "${credential.name}". Its hosts are: ${credential.hosts.join(', ') || 'none'}`;
	const runTime = (field: string) =>
		`${field} is an expression, so n8n checks its host at run time against the hosts of the credential "${credential.name}": ${credential.hosts.join(', ') || 'none'}`;
	const fromInput = egress?.fromInput;
	const url = fromInput === undefined ? undefined : parameters[fromInput];
	const templates = (egress?.hosts ?? []).filter((host) => host.includes('{'));
	const dynamic = templates.flatMap((template) =>
		[...template.matchAll(/\{([^}]+)\}/g)].flatMap(([, field]) =>
			field && isExpression(parameters[field]) ? [field] : [],
		),
	);
	const filled = templates.flatMap((template) => {
		try {
			return [filledHost(template, parameters)];
		} catch {
			return [];
		}
	});
	const hosts = unique([...filled, isExpression(url) ? undefined : urlHostOf(url)]);
	return {
		errors: hosts.filter((host) => !allowsHost(credential.hosts, host)).map(outside),
		warnings: unique([...(fromInput && isExpression(url) ? [fromInput] : []), ...dynamic]).map(
			runTime,
		),
	};
}

/**
 * What one action, trigger or provider may do, as `permissionsOf` reads it from the contract
 * document and the credential types. The host also lets the action reach the hosts of the node
 * base URL.
 */
export interface ContractPermissions {
	/** Where the action may send requests, besides the hosts of the node base URL. */
	readonly egress: {
		/** Host patterns, sorted: the declared hosts and the hosts of the credential types. */
		readonly hosts: readonly string[];
		/** Declared host templates over enum inputs, sorted, e.g. `{region}.api.example.com`. */
		readonly templates: readonly string[];
		/** The input field with a URL. The action may reach each host that the user enters there. */
		readonly fromInput?: string;
		/** Credential types whose host the user enters in the credential, e.g. `{url}`, sorted. */
		readonly fromCredential: readonly string[];
	};
	/** The credential types that the action may use, sorted. */
	readonly credentials: readonly string[];
	/** The scopes of the node credential, sorted. Absent when the contract declares none. */
	readonly scopes?: readonly string[];
	/** The optional host imports, sorted, e.g. `dataTables`. */
	readonly imports: readonly HostImport[];
	/** True when the action reads or writes files of the n8n binary data store. */
	readonly binary: boolean;
	/** The provider capabilities that the action calls, sorted, e.g. `chatModel`. */
	readonly supplied: readonly ProviderKind[];
	/** The limits of one run. */
	readonly limits: RunLimits;
}

const sorted = <T extends string>(values: readonly T[]) => [...new Set(values)].sort();

const credentialBaseUrls = ({ baseUrl }: AnyCredentialType) =>
	typeof baseUrl === 'string' ? [baseUrl] : Object.values(baseUrl?.values ?? {});

/**
 * The permissions of one contract: one normalized view for the host, the diff and the
 * generated catalog. `credentialTypes` adds the hosts of the types that the contract names.
 * `limits` are the limits of the host, as `ExecutorHost.limits`.
 */
export function permissionsOf(
	contract: ContractDocument,
	credentialTypes: readonly AnyCredentialType[] = [],
	limits: Partial<RunLimits> = {},
): ContractPermissions {
	const { egress, scopes } = contract;
	const isTemplate = (host: string) => host.includes('{');
	const declared = egress?.hosts ?? [];
	const types = credentialTypes.filter(({ name }) => contract.credentials.includes(name));
	// A base URL host from a credential field, e.g. `{url}`, is each host that the user enters.
	const baseHosts = types.flatMap((type) =>
		credentialBaseUrls(type).map((url) => {
			const host = toHostname(url);
			return { name: type.name, host: host === undefined || isTemplate(host) ? undefined : host };
		}),
	);
	return {
		egress: {
			hosts: sorted([
				...declared.filter((host) => !isTemplate(host)),
				...types.flatMap(({ hosts }) => hosts ?? []),
				...baseHosts.flatMap(({ host }) => host ?? []),
			]),
			templates: sorted(declared.filter(isTemplate)),
			...(egress?.fromInput === undefined ? {} : { fromInput: egress.fromInput }),
			fromCredential: sorted(baseHosts.flatMap(({ name, host }) => (host ? [] : [name]))),
		},
		credentials: sorted(contract.credentials),
		...(scopes ? { scopes: sorted(scopes) } : {}),
		imports: sorted(contract.imports ?? []),
		binary: usesBinary(contract),
		supplied: sorted(
			Object.values(contract.input.properties ?? {}).flatMap(
				(field) => providerInputOf(field)?.kind ?? [],
			),
		),
		limits: { ...DEFAULT_RUN_LIMITS, ...limits },
	};
}
