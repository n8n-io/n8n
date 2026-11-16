import { ExternalSecretsProxy } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import { failExecution, type ExecutionSetup } from '../execution-context';

export function createVariables(context: ExecutionSetup): IDataObject {
	return new Proxy(
		{ ...context.options.variables },
		{
			get(target, key) {
				if (typeof key !== 'string' || key in target) return Reflect.get(target, key) ?? undefined;
				return notSupplied(context, 'VARIABLE_NOT_SUPPLIED', `the variable "${key}"`, 'variables');
			},
		},
	);
}

export function createExternalSecretsProxy(context: ExecutionSetup): ExternalSecretsProxy {
	const secrets = context.options.secrets ?? {};
	const missing = (name: string) =>
		notSupplied(context, 'SECRET_NOT_SUPPLIED', `the secret "${name}"`, 'secrets');
	const proxy = new ExternalSecretsProxy();
	proxy.setManager({
		hasProvider: (vault) => Object.hasOwn(secrets, vault) || missing(vault),
		hasSecret: (vault, key) => {
			if (!Object.hasOwn(secrets[vault] ?? {}, key)) return missing(`${vault}.${key}`);
			return secrets[vault][key] !== null;
		},
		getSecret: (vault, key) => secrets[vault]?.[key] ?? undefined,
		getSecretNames: (vault) => Object.keys(secrets[vault] ?? {}),
		getProviderNames: () => Object.keys(secrets),
	});
	return proxy;
}

function notSupplied(
	context: ExecutionSetup,
	code: 'VARIABLE_NOT_SUPPLIED' | 'SECRET_NOT_SUPPLIED',
	subject: string,
	option: string,
): never {
	return failExecution(
		context,
		new WorkflowTestError(
			code,
			`The workflow reads ${subject}. The test did not supply it. Supply it in the ${option} option, or pass null to test the missing case.`,
			{ workflow: context.handle.name },
		),
	);
}
