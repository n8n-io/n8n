export type Runtime =
	| 'kubernetes'
	| 'ecs'
	| 'cloud-run'
	| 'azure-container-apps'
	| 'azure-app-service'
	| 'docker'
	| 'other';

export type KubernetesProvider = 'aws' | 'azure' | 'gcp' | 'other';

/**
 * Names the platform n8n runs on. Reads only whether well-known platform
 * variables exist, never their values, so the result is safe to report.
 * Managed platforms come first because several of them set variables that
 * a plain container also has.
 */
export function detectRuntime(env: NodeJS.ProcessEnv, isDocker: boolean): Runtime {
	if (env.ECS_CONTAINER_METADATA_URI_V4 || env.ECS_CONTAINER_METADATA_URI) return 'ecs';
	if (env.CONTAINER_APP_NAME) return 'azure-container-apps';
	if (env.WEBSITE_SITE_NAME) return 'azure-app-service';
	// Knative on Kubernetes also sets `K_SERVICE`. Cloud Run does not set the Kubernetes variable.
	if (env.K_SERVICE && !env.KUBERNETES_SERVICE_HOST) return 'cloud-run';
	if (env.KUBERNETES_SERVICE_HOST) return 'kubernetes';
	return isDocker ? 'docker' : 'other';
}

/**
 * Names the cloud the node runs on, from vendor tags in the kernel release string, for example
 * `6.8.0-1067-azure`. It does not say who runs the cluster: a self-managed cluster on a cloud VM gives
 * the same answer as the managed service. Only tags a cloud sets on purpose count. A trailing `+` does
 * not, because any kernel built from a modified source tree has one, Raspberry Pi kernels included.
 * Container-Optimized OS, the default GKE image, has no cloud tag and gives `other`.
 */
export function detectKubernetesProvider(osRelease: string): KubernetesProvider {
	if (osRelease.includes('-azure')) return 'azure';
	if (osRelease.includes('-gke') || osRelease.includes('-gcp')) return 'gcp';
	if (osRelease.includes('amzn2') || osRelease.includes('-aws')) return 'aws';
	return 'other';
}
