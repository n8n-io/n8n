export type Runtime =
	| 'kubernetes'
	| 'ecs'
	| 'cloud-run'
	| 'azure-container-apps'
	| 'azure-app-service'
	| 'docker'
	| 'other';

export type KubernetesKind = 'eks' | 'aks' | 'gke' | 'other';

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
 * Best-effort guess of the cloud from the kernel release string, for example `5.10.0-1234-azure`.
 * Container-Optimized OS, the default GKE image, ends in `+`. Other node images, such as
 * Bottlerocket, carry no cloud name and give `other`.
 */
export function detectKubernetesKind(osRelease: string): KubernetesKind {
	if (osRelease.includes('-azure')) return 'aks';
	if (osRelease.includes('-gke') || /\d\+$/.test(osRelease)) return 'gke';
	if (osRelease.includes('amzn2')) return 'eks';
	return 'other';
}
