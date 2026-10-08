import type { InstanceRegistration } from '@n8n/api-types';

/**
 * Totals for the `pulse` packet, from the instance registry. Only numbers leave:
 * the host names and keys in the registrations stay here.
 * Returns nothing when the registry is empty, so a missing registry does not read as zero processes.
 */
export function summarizeFootprint(instances: InstanceRegistration[]) {
	if (instances.length === 0) return {};

	const count = (type: InstanceRegistration['instanceType']) =>
		instances.filter((i) => i.instanceType === type).length;

	let cpu = 0;
	let memory = 0;
	let unlimited = 0;
	for (const { cpuLimit, memoryLimit } of instances) {
		// A process with no limit has no known size, so it adds nothing and is counted instead.
		if (typeof cpuLimit !== 'number' || typeof memoryLimit !== 'number') unlimited++;
		cpu += cpuLimit ?? 0;
		memory += memoryLimit ?? 0;
	}

	return {
		main_count: count('main'),
		worker_count: count('worker'),
		webhook_count: count('webhook'),
		engine_count: count('engine'),
		// Rounded, because fractional CPUs add up to noise such as 0.30000000000000004.
		cluster_cpu_limit: Math.round(cpu * 100) / 100,
		cluster_memory_limit: memory / 1024, // KiB, as `system_info.memory_limit`
		unlimited_process_count: unlimited,
	};
}
