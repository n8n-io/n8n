import type { InstanceRegistration } from '@n8n/api-types';

type ProcessGroup = {
	type: InstanceRegistration['instanceType'];
	/** `null` means no CPU limit. */
	cpu: number | null;
	/** `null` means no memory limit. */
	memory_kib: number | null;
	version: string;
	count: number;
};

/**
 * Groups the registered processes by type, limits and version for the `pulse` packet.
 * Only these numbers leave: the host names and keys in the registrations stay here.
 * Returns nothing when the registry is empty, so a missing registry does not read as zero processes.
 */
export function summarizeFootprint(instances: InstanceRegistration[]): {
	processes?: ProcessGroup[];
} {
	if (instances.length === 0) return {};

	const groups = new Map<string, ProcessGroup>();
	for (const { instanceType, cpuLimit, memoryLimit, version } of instances) {
		const cpu = cpuLimit ?? null;
		const memory_kib = typeof memoryLimit === 'number' ? memoryLimit / 1024 : null;
		const key = JSON.stringify([instanceType, cpu, memory_kib, version]);
		const group = groups.get(key);
		if (group) group.count++;
		else groups.set(key, { type: instanceType, cpu, memory_kib, version, count: 1 });
	}

	return { processes: [...groups.values()] };
}
