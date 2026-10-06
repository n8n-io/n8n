import { detectKubernetesKind, detectRuntime } from '../detect-runtime';

describe('detectRuntime', () => {
	it.each([
		['ecs', { ECS_CONTAINER_METADATA_URI_V4: 'http://169.254.170.2/v4/abc' }],
		['ecs', { ECS_CONTAINER_METADATA_URI: 'http://169.254.170.2/v3/abc' }],
		['azure-container-apps', { CONTAINER_APP_NAME: 'n8n' }],
		['azure-app-service', { WEBSITE_SITE_NAME: 'n8n' }],
		['cloud-run', { K_SERVICE: 'n8n', K_REVISION: 'n8n-001' }],
		['kubernetes', { KUBERNETES_SERVICE_HOST: '10.0.0.1' }],
	])('returns %s', (expected, env) => {
		expect(detectRuntime(env, true)).toBe(expected);
	});

	it('returns kubernetes for Knative, which also sets K_SERVICE', () => {
		const env = { K_SERVICE: 'n8n', KUBERNETES_SERVICE_HOST: '10.0.0.1' };
		expect(detectRuntime(env, true)).toBe('kubernetes');
	});

	it('prefers a managed platform over the Kubernetes variable', () => {
		const env = { CONTAINER_APP_NAME: 'n8n', KUBERNETES_SERVICE_HOST: '10.0.0.1' };
		expect(detectRuntime(env, true)).toBe('azure-container-apps');
	});

	it('returns docker when no platform variable is set', () => {
		expect(detectRuntime({}, true)).toBe('docker');
	});

	it('returns other outside a container', () => {
		expect(detectRuntime({}, false)).toBe('other');
	});

	it('ignores empty variables', () => {
		expect(detectRuntime({ KUBERNETES_SERVICE_HOST: '' }, false)).toBe('other');
	});
});

describe('detectKubernetesKind', () => {
	it.each([
		['aks', '5.15.0-1057-azure'],
		['gke', '6.1.58+-gke'],
		['gke', '5.15.0-1030-gke'],
		['eks', '5.10.205-195.807.amzn2.x86_64'],
		['eks', '6.1.102-111.182.amzn2023.aarch64'],
		['other', '6.8.0-45-generic'],
		['other', ''],
	])('returns %s for %s', (expected, release) => {
		expect(detectKubernetesKind(release)).toBe(expected);
	});
});
