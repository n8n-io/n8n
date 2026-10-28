import { trace, type TracerDelegator, type TracerProvider } from '@opentelemetry/api';
import type { InstrumentationScope } from '@opentelemetry/core';
import { UnexpectedError } from 'n8n-workflow';

import { WORKFLOW_TRACER_NAME } from './tracer-names';

export type TracerConfig = { enabled: boolean; provider?: TracerProvider };

export type TracerConfigurator = (scope: InstrumentationScope) => TracerConfig;

type GlobalTracerProvider = TracerProvider & TracerDelegator;

export function createTracerConfigurator(
	enabledTracerNames: Set<string>,
	dedicatedProviders = new Map<string, TracerProvider>(),
): TracerConfigurator {
	return ({ name }) => {
		const provider = dedicatedProviders.get(name);
		return provider ? { enabled: true, provider } : { enabled: enabledTracerNames.has(name) };
	};
}

export function isTracerProviderRegistered(): boolean {
	return globalTracerProvider().getDelegateTracer(WORKFLOW_TRACER_NAME) !== undefined;
}

// Remove when NodeSDK accepts a tracerConfigurator option: https://github.com/open-telemetry/opentelemetry-js/issues/6960
// The open OTel PR 7106 adds the option only to TracerProvider and the config file, not to NodeSDK.
export function applyTracerConfigurator(configurator: TracerConfigurator): void {
	const provider = globalTracerProvider();
	const getDelegateTracer = provider.getDelegateTracer.bind(provider);

	provider.getDelegateTracer = (name, version, options) => {
		const config = configurator({ name, version, schemaUrl: options?.schemaUrl });
		if (!config.enabled) return undefined;

		return (
			config.provider?.getTracer(name, version, options) ??
			getDelegateTracer(name, version, options)
		);
	};
}

function globalTracerProvider(): GlobalTracerProvider {
	const provider = trace.getTracerProvider();
	if (!isTracerDelegator(provider)) {
		throw new UnexpectedError(
			'The OpenTelemetry API returned a tracer provider without a delegate',
		);
	}

	return provider;
}

function isTracerDelegator(provider: TracerProvider): provider is GlobalTracerProvider {
	return 'getDelegateTracer' in provider && typeof provider.getDelegateTracer === 'function';
}
