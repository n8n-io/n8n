import { detectKubernetesProvider, detectRuntime } from '../detect-runtime';

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

describe('detectKubernetesProvider', () => {
	// Strings captured from real nodes or taken from the vendor's documented naming.
	it.each([
		['azure', '6.8.0-1067-azure'], // captured on AKS
		['aws', '6.12.110-135.201.amzn2023.x86_64'], // captured on EKS
		['aws', '5.10.205-195.807.amzn2.x86_64'],
		['aws', '6.8.0-1012-aws'],
		['gcp', '6.8.0-1015-gke'],
		['gcp', '6.8.0-1015-gcp'],
	])('returns %s for %s', (expected, release) => {
		expect(detectKubernetesProvider(release)).toBe(expected);
	});

	// Anything that does not carry a cloud tag must stay `other`, so the field never reports a cloud wrongly.
	it.each([
		['minikube', '6.8.0-100-generic'], // captured on minikube
		['Raspberry Pi, with suffix', '6.1.21-v8+'],
		['Raspberry Pi, plain', '6.1.21+'],
		['kernel built from a modified tree', '5.15.0+'],
		['Container-Optimized OS', '6.6.56+'],
		['Bottlerocket', '6.1.102'],
		['Debian', '6.1.0-25-amd64'],
		['Ubuntu generic', '6.8.0-45-generic'],
		['Docker Desktop', '6.10.14-linuxkit'],
		['empty', ''],
	])('returns other for %s', (_name, release) => {
		expect(detectKubernetesProvider(release)).toBe('other');
	});
});
